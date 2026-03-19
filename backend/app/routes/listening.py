import re
import unicodedata
import json
from pathlib import Path

from flask import Blueprint, jsonify, request, send_from_directory
from flask_login import current_user, login_required

from app import db
from app.models.listening_attempt import ListeningAttempt
from app.models.progress import Progress

listening_bp = Blueprint('listening', __name__, url_prefix='/api/listening')

PROJECT_ROOT = Path(__file__).resolve().parents[3]
AUDIO_DIR = PROJECT_ROOT / 'Audio'
TRANSCRIPT_DIR = PROJECT_ROOT / 'output'
QUESTION_DIR = PROJECT_ROOT / 'generated_questions_md'

SUPPORTED_PRACTICE_LEVELS = {'beginner', 'intermediate'}
SUPPORTED_PRACTICE_SCENARIOS = {'lecture-clips'}

LEVELS = [
    {
        'id': 'beginner',
        'label': 'Beginner',
        'description': 'Build confidence with shorter and more guided academic audio.',
    },
    {
        'id': 'intermediate',
        'label': 'Intermediate',
        'description': 'Practice following longer ideas, transitions, and supporting details.',
    },
    {
        'id': 'advanced',
        'label': 'Advanced',
        'description': 'Tackle denser clips and more nuanced academic speaking styles.',
    },
]

SCENARIOS = [
    {
        'id': 'lecture-clips',
        'label': 'Lecture Clips',
        'description': 'Short lecture excerpts focused on main ideas and note-taking cues.',
    },
    {
        'id': 'group-discussion',
        'label': 'Group Discussion',
        'description': 'Multi-speaker clips for following opinions, turn-taking, and examples.',
    },
    {
        'id': 'qa-session',
        'label': 'Q&A Session',
        'description': 'Question-and-answer style practice for clarifications and quick responses.',
    },
    {
        'id': 'office-hour',
        'label': 'Office Hour',
        'description': 'Conversation-style clips with feedback, advice, and follow-up questions.',
    },
]

QUESTION_SECTION_RULES = {
    'beginner': [
        ('Multiple Choice', 'multiple_choice', 'Multiple choice'),
    ],
    'intermediate': [
        ('Fill in the Blank', 'fill_in_the_blank', 'Fill in the blank'),
        ('Short Answer', 'short_answer', 'Short answer'),
    ],
}

QUESTION_INSTRUCTIONS = {
    'beginner': 'Listen to the lecture clip and answer the multiple-choice questions.',
    'intermediate': 'Listen carefully, then complete the fill-in-the-blank and short-answer tasks.',
}

STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'how',
    'i', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'she', 'that', 'the',
    'their', 'them', 'they', 'this', 'to', 'was', 'we', 'what', 'who', 'will', 'with', 'you',
    'your',
}

ANSWER_PATTERN = re.compile(r'^\s*\*\*Answer:\*\*\s*(.+?)\s*$', re.IGNORECASE)
EXPLANATION_PATTERN = re.compile(r'^\s*\*\*Explanation:\*\*\s*(.+?)\s*$', re.IGNORECASE)
OPTION_PATTERN = re.compile(r'^\s*([A-D])\.\s*(.+?)\s*$')
QUESTION_PATTERN = re.compile(r'^\s*(\d+)\.\s*(.+?)\s*$')


def _canonical_stem(path):
    return re.sub(r' \(\d+\)$', '', path.stem).strip()


def _canonical_question_stem(path):
    return re.sub(r'_questions$', '', _canonical_stem(path), flags=re.IGNORECASE).strip()


def _slugify(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def _preview_text(text, limit=180):
    compact = re.sub(r'\s+', ' ', text).strip()
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit - 3].rstrip()}..."


def _display_title(stem):
    clean = re.sub(r' \(\d+\)$', '', stem)
    tokens = re.split(r'[\s_-]+', clean)
    formatted = []

    for token in tokens:
        if not token:
            continue
        lower = token.lower()
        if token.isupper() or any(ch.isdigit() for ch in token):
            formatted.append(token)
        elif lower == 'ai':
            formatted.append('AI')
        elif lower == 'ted':
            formatted.append('TED')
        elif token != lower:
            formatted.append(token)
        else:
            formatted.append(token.capitalize())

    return ' '.join(formatted)


def _is_practice_available(level_id, scenario_id):
    return level_id in SUPPORTED_PRACTICE_LEVELS and scenario_id in SUPPORTED_PRACTICE_SCENARIOS


def _clean_markdown_text(value):
    cleaned = (value or '')
    cleaned = cleaned.replace('\u00a0', ' ').replace('\u202f', ' ').replace('\u2011', '-')
    cleaned = re.sub(r'[*`]+', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()


def _normalize_answer_text(value):
    normalized = unicodedata.normalize('NFKD', value or '')
    normalized = normalized.replace('&', ' and ')
    normalized = re.sub(r'(\d+)(st|nd|rd|th)\b', r'\1', normalized, flags=re.IGNORECASE)
    normalized = normalized.lower()
    normalized = re.sub(r'[^a-z0-9]+', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()


def _normalize_token(token):
    if token.endswith('ies') and len(token) > 4:
        return f"{token[:-3]}y"
    if token.endswith('s') and len(token) > 3:
        return token[:-1]
    return token


def _keyword_tokens(value):
    normalized = _normalize_answer_text(value)
    if not normalized:
        return []

    tokens = []
    for token in normalized.split():
        token = _normalize_token(token)
        if token and token not in STOPWORDS:
            tokens.append(token)
    return tokens


def _split_question_blocks(section_text):
    blocks = []
    current_block = []

    for raw_line in section_text.splitlines():
        line = raw_line.rstrip()
        if re.match(r'^\s*\d+\.\s+', line):
            if current_block:
                blocks.append('\n'.join(current_block))
            current_block = [line]
            continue

        if current_block:
            current_block.append(line)

    if current_block:
        blocks.append('\n'.join(current_block))

    return blocks


def _extract_level_block(markdown, level_label):
    pattern = re.compile(
        rf'^##\s+{re.escape(level_label)}\s*$([\s\S]*?)(?=^##\s+|\Z)',
        re.MULTILINE,
    )
    match = pattern.search(markdown)
    return match.group(1).strip() if match else ''


def _extract_section_block(level_block, section_label):
    pattern = re.compile(
        rf'^###\s+{re.escape(section_label)}(?:\s*\([^)]+\))?\s*$([\s\S]*?)(?=^###\s+|\Z)',
        re.MULTILINE,
    )
    match = pattern.search(level_block)
    return match.group(1).strip() if match else ''


def _parse_correct_option(answer_text, options):
    cleaned_answer = _clean_markdown_text(answer_text)
    option_match = re.match(r'^([A-D])(?:[\.\)]\s*(.*))?$', cleaned_answer, re.IGNORECASE)
    if option_match:
        return option_match.group(1).upper()

    normalized_answer = _normalize_answer_text(cleaned_answer)
    for option in options:
        if _normalize_answer_text(option['text']) == normalized_answer:
            return option['key']

    return ''


def _parse_multiple_choice_questions(section_text, source_slug, level_id, starting_number):
    questions = []
    question_number = starting_number

    for block in _split_question_blocks(section_text):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        question_match = QUESTION_PATTERN.match(lines[0])
        if not question_match:
            continue

        prompt_parts = [_clean_markdown_text(question_match.group(2))]
        options = []
        answer = ''
        explanation = ''
        current_field = 'prompt'

        for line in lines[1:]:
            answer_match = ANSWER_PATTERN.match(line)
            if answer_match:
                answer = _clean_markdown_text(answer_match.group(1))
                current_field = 'answer'
                continue

            explanation_match = EXPLANATION_PATTERN.match(line)
            if explanation_match:
                explanation = _clean_markdown_text(explanation_match.group(1))
                current_field = 'explanation'
                continue

            option_match = OPTION_PATTERN.match(line)
            if option_match:
                options.append({
                    'key': option_match.group(1).upper(),
                    'text': _clean_markdown_text(option_match.group(2)),
                })
                current_field = 'options'
                continue

            cleaned_line = _clean_markdown_text(line)
            if not cleaned_line:
                continue

            if current_field == 'prompt':
                prompt_parts.append(cleaned_line)
            elif current_field == 'options' and options:
                options[-1]['text'] = _clean_markdown_text(f"{options[-1]['text']} {cleaned_line}")
            elif current_field == 'answer' and answer:
                answer = _clean_markdown_text(f"{answer} {cleaned_line}")
            elif current_field == 'explanation' and explanation:
                explanation = _clean_markdown_text(f"{explanation} {cleaned_line}")

        if not options:
            continue

        correct_option = _parse_correct_option(answer, options)
        correct_option_text = next(
            (option['text'] for option in options if option['key'] == correct_option),
            '',
        )
        correct_answer_display = (
            f"{correct_option}. {correct_option_text}".strip()
            if correct_option and correct_option_text
            else answer
        )

        questions.append({
            'id': f"{level_id}-{source_slug}-multiple-choice-{question_number}",
            'number': question_number,
            'type': 'multiple_choice',
            'section_label': 'Multiple choice',
            'prompt': _clean_markdown_text(' '.join(prompt_parts)),
            'options': options,
            'correct_option': correct_option,
            'correct_answer': answer,
            'correct_answer_display': correct_answer_display,
            'explanation': explanation,
        })
        question_number += 1

    return questions


def _parse_text_questions(section_text, source_slug, level_id, question_type, section_label, starting_number):
    questions = []
    question_number = starting_number

    for block in _split_question_blocks(section_text):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        question_match = QUESTION_PATTERN.match(lines[0])
        if not question_match:
            continue

        opening_prompt = _clean_markdown_text(question_match.group(2))
        opening_prompt = re.sub(r'^Question:\s*', '', opening_prompt, flags=re.IGNORECASE)
        prompt_parts = [opening_prompt]
        answer = ''
        explanation = ''
        current_field = 'prompt'

        for line in lines[1:]:
            answer_match = ANSWER_PATTERN.match(line)
            if answer_match:
                answer = _clean_markdown_text(answer_match.group(1))
                current_field = 'answer'
                continue

            explanation_match = EXPLANATION_PATTERN.match(line)
            if explanation_match:
                explanation = _clean_markdown_text(explanation_match.group(1))
                current_field = 'explanation'
                continue

            cleaned_line = _clean_markdown_text(line)
            if not cleaned_line:
                continue

            if current_field == 'prompt':
                prompt_parts.append(cleaned_line)
            elif current_field == 'answer' and answer:
                answer = _clean_markdown_text(f"{answer} {cleaned_line}")
            elif current_field == 'explanation' and explanation:
                explanation = _clean_markdown_text(f"{explanation} {cleaned_line}")

        questions.append({
            'id': f"{level_id}-{source_slug}-{question_type.replace('_', '-')}-{question_number}",
            'number': question_number,
            'type': question_type,
            'section_label': section_label,
            'prompt': _clean_markdown_text(' '.join(prompt_parts)),
            'correct_answer': answer,
            'correct_answer_display': answer,
            'explanation': explanation,
        })
        question_number += 1

    return questions


def _load_practice_questions(source, level_id):
    section_rules = QUESTION_SECTION_RULES.get(level_id)
    if not section_rules:
        return []

    markdown = source['question_path'].read_text(encoding='utf-8')
    level_block = _extract_level_block(markdown, level_id.capitalize())
    if not level_block:
        return []

    questions = []
    next_number = 1

    for section_heading, question_type, section_label in section_rules:
        section_text = _extract_section_block(level_block, section_heading)
        if not section_text:
            continue

        if question_type == 'multiple_choice':
            parsed_questions = _parse_multiple_choice_questions(
                section_text,
                source['source_slug'],
                level_id,
                next_number,
            )
        else:
            parsed_questions = _parse_text_questions(
                section_text,
                source['source_slug'],
                level_id,
                question_type,
                section_label,
                next_number,
            )

        questions.extend(parsed_questions)
        next_number += len(parsed_questions)

    return questions


def _serialize_public_question(question):
    serialized = {
        'id': question['id'],
        'number': question['number'],
        'type': question['type'],
        'section_label': question['section_label'],
        'prompt': question['prompt'],
    }

    if question['type'] == 'multiple_choice':
        serialized['options'] = question['options']

    return serialized


def _fill_in_blank_is_correct(user_response, correct_answer):
    normalized_user = _normalize_answer_text(user_response)
    normalized_correct = _normalize_answer_text(correct_answer)

    if not normalized_user or not normalized_correct:
        return False

    if normalized_user == normalized_correct:
        return True

    user_tokens = _keyword_tokens(user_response)
    correct_tokens = _keyword_tokens(correct_answer)
    if user_tokens and correct_tokens and user_tokens == correct_tokens:
        return True

    return (
        len(normalized_user) >= 4 and normalized_user in normalized_correct
    ) or (
        len(normalized_correct) >= 4 and normalized_correct in normalized_user
    )


def _short_answer_is_correct(user_response, correct_answer):
    normalized_user = _normalize_answer_text(user_response)
    normalized_correct = _normalize_answer_text(correct_answer)

    if not normalized_user or not normalized_correct:
        return False

    if normalized_user == normalized_correct:
        return True

    if len(normalized_user) >= 8 and (
        normalized_user in normalized_correct or normalized_correct in normalized_user
    ):
        return True

    user_tokens = set(_keyword_tokens(user_response))
    correct_tokens = set(_keyword_tokens(correct_answer))
    if not user_tokens or not correct_tokens:
        return False

    overlap = user_tokens & correct_tokens
    coverage = len(overlap) / len(correct_tokens)
    precision = len(overlap) / len(user_tokens)

    if len(correct_tokens) <= 2:
        return coverage == 1
    if len(correct_tokens) <= 4:
        return coverage >= 0.75 and len(overlap) >= 2
    return coverage >= 0.6 and precision >= 0.5 and len(overlap) >= 2


def _grade_question(question, raw_response):
    user_response = ''
    if isinstance(raw_response, str):
        user_response = raw_response.strip()
    elif raw_response is not None:
        user_response = str(raw_response).strip()

    if question['type'] == 'multiple_choice':
        is_correct = user_response.upper() == question.get('correct_option', '').upper()
    elif question['type'] == 'fill_in_the_blank':
        is_correct = _fill_in_blank_is_correct(user_response, question['correct_answer'])
    else:
        is_correct = _short_answer_is_correct(user_response, question['correct_answer'])

    result = {
        'id': question['id'],
        'number': question['number'],
        'type': question['type'],
        'section_label': question['section_label'],
        'prompt': question['prompt'],
        'user_response': user_response,
        'is_correct': is_correct,
        'correct_answer': question['correct_answer_display'],
        'explanation': question['explanation'],
    }

    if question['type'] == 'multiple_choice':
        result['options'] = question['options']
        result['correct_option'] = question['correct_option']

    return result


def _build_practice_payload(level, scenario, source, include_answers=False):
    questions = _load_practice_questions(source, level['id'])
    if not questions:
        return None

    clip = _clip_from_source(source, level, scenario)
    payload = {
        'level': {
            'id': level['id'],
            'label': level['label'],
        },
        'scenario': {
            'id': scenario['id'],
            'label': scenario['label'],
        },
        'clip': clip,
        'instructions': QUESTION_INSTRUCTIONS.get(level['id'], ''),
        'question_count': len(questions),
        'questions': [
            question if include_answers else _serialize_public_question(question)
            for question in questions
        ],
    }
    return payload


def _find_saved_attempt(user_id, level_id, scenario_id, source_slug):
    return ListeningAttempt.query.filter_by(
        user_id=user_id,
        level_id=level_id,
        scenario_id=scenario_id,
        source_slug=source_slug,
    ).first()


def _find_level(level_id):
    return next((level for level in LEVELS if level['id'] == level_id), None)


def _find_scenario(scenario_id):
    return next((scenario for scenario in SCENARIOS if scenario['id'] == scenario_id), None)


def _find_source(source_slug):
    return next((item for item in _load_sources() if item['source_slug'] == source_slug), None)


def _load_sources():
    transcript_map = {}
    for transcript_path in sorted(TRANSCRIPT_DIR.glob('*.txt')):
        transcript_map[_canonical_stem(transcript_path)] = transcript_path

    question_map = {}
    for question_path in sorted(QUESTION_DIR.glob('*_questions.md')):
        question_map[_canonical_question_stem(question_path)] = question_path

    sources = []
    seen_stems = set()

    for audio_path in sorted(AUDIO_DIR.glob('*.mp3')):
        canonical_stem = _canonical_stem(audio_path)
        if canonical_stem in seen_stems:
            continue

        transcript_path = transcript_map.get(canonical_stem)
        question_path = question_map.get(canonical_stem)
        if transcript_path is None or question_path is None:
            continue

        seen_stems.add(canonical_stem)
        transcript = transcript_path.read_text(encoding='utf-8').strip()
        source_slug = _slugify(canonical_stem)

        sources.append({
            'source_slug': source_slug,
            'source_title': _display_title(canonical_stem),
            'audio_filename': audio_path.name,
            'transcript': transcript,
            'transcript_preview': _preview_text(transcript),
            'question_path': question_path,
        })

    return sources


def _clip_from_source(source, level, scenario):
    clip_id = f"{level['id']}-{scenario['id']}-{source['source_slug']}"
    return {
        'id': clip_id,
        'title': source['source_title'],
        'audio_url': f"/api/listening/audio/{source['source_slug']}",
        'difficulty_level': level['id'],
        'scenario_type': scenario['id'],
        'source_slug': source['source_slug'],
        'transcript': source['transcript'],
        'transcript_preview': source['transcript_preview'],
        'practice_available': _is_practice_available(level['id'], scenario['id']),
        'duration': None,
    }


def _build_catalog():
    sources = _load_sources()
    levels = []
    for level in LEVELS:
        scenarios = []
        for scenario in SCENARIOS:
            is_available = _is_practice_available(level['id'], scenario['id'])
            clips = [
                _clip_from_source(source, level, scenario)
                for source in sources
            ] if is_available else []
            scenarios.append({
                'id': scenario['id'],
                'label': scenario['label'],
                'description': scenario['description'],
                'is_available': is_available,
                'coming_soon': not is_available,
                'clip_count': len(clips),
                'clips': clips,
            })

        levels.append({
            'id': level['id'],
            'label': level['label'],
            'description': level['description'],
            'is_available': any(scenario['is_available'] for scenario in scenarios),
            'clip_count': sum(scenario['clip_count'] for scenario in scenarios),
            'scenarios': scenarios,
        })

    return {
        'levels': levels,
        'source_count': len(sources),
    }


@listening_bp.route('/clips', methods=['GET'])
@login_required
def get_listening_catalog():
    return jsonify(_build_catalog()), 200


@listening_bp.route('/audio/<source_slug>', methods=['GET'])
@login_required
def stream_audio(source_slug):
    source = _find_source(source_slug)
    if source is None:
        return jsonify({'error': 'Clip not found'}), 404

    return send_from_directory(
        AUDIO_DIR,
        source['audio_filename'],
        mimetype='audio/mpeg',
        as_attachment=False,
        conditional=True,
    )


@listening_bp.route('/quiz/<level_id>/<scenario_id>/<source_slug>', methods=['GET'])
@login_required
def get_listening_practice(level_id, scenario_id, source_slug):
    level = _find_level(level_id)
    scenario = _find_scenario(scenario_id)
    source = _find_source(source_slug)

    if level is None or scenario is None or source is None:
        return jsonify({'error': 'Practice material not found'}), 404

    if not _is_practice_available(level_id, scenario_id):
        return jsonify({'error': 'Practice for this level and scenario is coming soon'}), 404

    payload = _build_practice_payload(level, scenario, source)
    if payload is None:
        return jsonify({'error': 'Questions were not found for this clip'}), 404

    saved_attempt = _find_saved_attempt(current_user.id, level_id, scenario_id, source_slug)
    payload['saved_attempt'] = saved_attempt.to_dict() if saved_attempt else None

    return jsonify(payload), 200


@listening_bp.route('/quiz/<level_id>/<scenario_id>/<source_slug>/submit', methods=['POST'])
@login_required
def submit_listening_practice(level_id, scenario_id, source_slug):
    level = _find_level(level_id)
    scenario = _find_scenario(scenario_id)
    source = _find_source(source_slug)

    if level is None or scenario is None or source is None:
        return jsonify({'error': 'Practice material not found'}), 404

    if not _is_practice_available(level_id, scenario_id):
        return jsonify({'error': 'Practice for this level and scenario is coming soon'}), 404

    payload = request.get_json(silent=True) or {}
    answers = payload.get('answers')
    if not isinstance(answers, dict):
        return jsonify({'error': 'Answers must be provided as an object'}), 400

    questions = _load_practice_questions(source, level_id)
    if not questions:
        return jsonify({'error': 'Questions were not found for this clip'}), 404

    results = [_grade_question(question, answers.get(question['id'])) for question in questions]
    correct_count = sum(1 for result in results if result['is_correct'])
    total_count = len(results)
    score = round((correct_count / total_count) * 100, 1) if total_count else 0
    time_spent = payload.get('time_spent')
    time_spent = time_spent if isinstance(time_spent, int) and time_spent >= 0 else None

    progress_record = Progress(
        user_id=current_user.id,
        module='listening',
        activity_type=f'{level_id}:{scenario_id}:{source_slug}',
        score=score,
        time_spent=time_spent,
    )
    db.session.add(progress_record)

    serialized_answers = {}
    for question in questions:
        serialized_answers[question['id']] = answers.get(question['id'], '')

    saved_attempt = _find_saved_attempt(current_user.id, level_id, scenario_id, source_slug)
    if saved_attempt is None:
        saved_attempt = ListeningAttempt(
            user_id=current_user.id,
            level_id=level_id,
            scenario_id=scenario_id,
            source_slug=source_slug,
            answers_json='{}',
            results_json='[]',
            transcript='',
            score=0,
            correct_count=0,
            total_count=0,
        )
        db.session.add(saved_attempt)

    saved_attempt.answers_json = json.dumps(serialized_answers)
    saved_attempt.results_json = json.dumps(results)
    saved_attempt.transcript = source['transcript']
    saved_attempt.score = score
    saved_attempt.correct_count = correct_count
    saved_attempt.total_count = total_count
    db.session.commit()

    return jsonify({
        'level': {
            'id': level['id'],
            'label': level['label'],
        },
        'scenario': {
            'id': scenario['id'],
            'label': scenario['label'],
        },
        'clip': _clip_from_source(source, level, scenario),
        'progress_id': progress_record.id,
        'score': score,
        'correct_count': correct_count,
        'total_count': total_count,
        'results': results,
        'transcript': source['transcript'],
    }), 200
