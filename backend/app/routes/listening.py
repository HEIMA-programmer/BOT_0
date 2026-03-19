import re
from pathlib import Path

from flask import Blueprint, jsonify, send_from_directory
from flask_login import login_required

listening_bp = Blueprint('listening', __name__, url_prefix='/api/listening')

PROJECT_ROOT = Path(__file__).resolve().parents[3]
AUDIO_DIR = PROJECT_ROOT / 'Audio'
TRANSCRIPT_DIR = PROJECT_ROOT / 'output'

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


def _canonical_stem(path):
    return re.sub(r' \(\d+\)$', '', path.stem).strip()


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


def _load_sources():
    transcript_map = {}
    for transcript_path in sorted(TRANSCRIPT_DIR.glob('*.txt')):
        transcript_map[_canonical_stem(transcript_path)] = transcript_path

    sources = []
    seen_stems = set()

    for audio_path in sorted(AUDIO_DIR.glob('*.mp3')):
        canonical_stem = _canonical_stem(audio_path)
        if canonical_stem in seen_stems:
            continue

        transcript_path = transcript_map.get(canonical_stem)
        if transcript_path is None:
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
        'duration': None,
    }


def _build_catalog():
    sources = _load_sources()
    bucket_keys = [(level, scenario) for level in LEVELS for scenario in SCENARIOS]
    bucket_count = len(bucket_keys)
    buckets = {(level['id'], scenario['id']): [] for level, scenario in bucket_keys}

    if not sources:
        return {
            'levels': [],
            'source_count': 0,
            'bucket_count': bucket_count,
        }

    for index, (level, scenario) in enumerate(bucket_keys):
        source = sources[index % len(sources)]
        buckets[(level['id'], scenario['id'])].append(_clip_from_source(source, level, scenario))

    for index, source in enumerate(sources[bucket_count:], start=bucket_count):
        level, scenario = bucket_keys[index % bucket_count]
        buckets[(level['id'], scenario['id'])].append(_clip_from_source(source, level, scenario))

    levels = []
    for level in LEVELS:
        scenarios = []
        for scenario in SCENARIOS:
            clips = buckets[(level['id'], scenario['id'])]
            scenarios.append({
                'id': scenario['id'],
                'label': scenario['label'],
                'description': scenario['description'],
                'clip_count': len(clips),
                'clips': clips,
            })

        levels.append({
            'id': level['id'],
            'label': level['label'],
            'description': level['description'],
            'clip_count': sum(scenario['clip_count'] for scenario in scenarios),
            'scenarios': scenarios,
        })

    return {
        'levels': levels,
        'source_count': len(sources),
        'bucket_count': bucket_count,
    }


@listening_bp.route('/clips', methods=['GET'])
@login_required
def get_listening_catalog():
    return jsonify(_build_catalog()), 200


@listening_bp.route('/audio/<source_slug>', methods=['GET'])
@login_required
def stream_audio(source_slug):
    source = next((item for item in _load_sources() if item['source_slug'] == source_slug), None)
    if source is None:
        return jsonify({'error': 'Clip not found'}), 404

    return send_from_directory(
        AUDIO_DIR,
        source['audio_filename'],
        mimetype='audio/mpeg',
        as_attachment=False,
        conditional=True,
    )
