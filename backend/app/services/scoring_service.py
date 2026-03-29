"""
Scoring service using DeepSeek API to evaluate AI conversations.
Uses OpenAI-compatible API format.
"""

import json
import os
import httpx


class ScoringService:
    def __init__(self):
        self.api_key = os.getenv('DEEPSEEK_API_KEY')
        self.api_url = os.getenv('DEEPSEEK_API_URL', 'https://api.deepseek.com')
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment variables")

    def score_conversation(self, messages, scenario_type=None, sub_scenario=None):
        """
        Score a conversation using DeepSeek API.

        Args:
            messages: list of dicts with 'role' and 'content'
            scenario_type: optional scenario type for task completion scoring
            sub_scenario: optional sub-scenario key

        Returns:
            dict with scores, feedback, strengths, improvements, suggested_phrases
        """
        transcript = self._format_transcript(messages)
        prompt = self._build_prompt(transcript, scenario_type, sub_scenario)

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.api_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "You are an expert English language assessor. Always respond with valid JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return json.loads(content)

        except httpx.HTTPStatusError as e:
            raise Exception(f"DeepSeek API error: {e.response.status_code} - {e.response.text}")
        except (json.JSONDecodeError, KeyError) as e:
            raise Exception(f"Failed to parse DeepSeek response: {e}")

    def _format_transcript(self, messages):
        lines = []
        for msg in messages:
            role = "Student" if msg["role"] == "user" else "AI Partner"
            lines.append(f"{role}: {msg['content']}")
        return "\n".join(lines)

    def _build_prompt(self, transcript, scenario_type=None, sub_scenario=None):
        is_guided = scenario_type and scenario_type != 'free_conversation'

        scenario_context = ""
        if is_guided:
            type_label = scenario_type.replace('_', ' ').title()
            sub_label = (sub_scenario or '').replace('_', ' ').title()
            scenario_context = f"\nScenario: {type_label} - {sub_label}"

        task_completion_section = ""
        if is_guided:
            task_completion_section = """
    "task_completion": {
      "score": <integer 1-10>,
      "feedback": "<one sentence about how well the student accomplished the scenario goals>"
    },"""

        return f"""Evaluate the following English conversation between a student and an AI conversation partner.{scenario_context}

## Conversation Transcript:
{transcript}

## Scoring Instructions:
Rate the STUDENT's English performance on each dimension from 1-10:
- **Grammar** (1-10): Accuracy of grammar, sentence structure, tense usage
- **Vocabulary** (1-10): Range and appropriateness of vocabulary used
- **Fluency** (1-10): Natural flow, response length, ability to express ideas smoothly
- **Coherence** (1-10): Logical flow of ideas, relevance of responses, conversation management
{"- **Task Completion** (1-10): How well the student accomplished the scenario-specific goals" if is_guided else ""}

Use 6 as baseline for acceptable performance. Be encouraging but honest.

## Required JSON Response Format:
{{
  "overall_score": <float, weighted average of all dimensions>,
  "dimensions": {{
    "grammar": {{
      "score": <integer 1-10>,
      "feedback": "<one sentence about grammar performance with specific examples>"
    }},
    "vocabulary": {{
      "score": <integer 1-10>,
      "feedback": "<one sentence about vocabulary usage with specific examples>"
    }},
    "fluency": {{
      "score": <integer 1-10>,
      "feedback": "<one sentence about fluency and natural expression>"
    }},
    "coherence": {{
      "score": <integer 1-10>,
      "feedback": "<one sentence about logical flow and conversation management>"
    }}{task_completion_section}
  }},
  "strengths": [
    "<strength 1>",
    "<strength 2>"
  ],
  "improvements": [
    "<improvement suggestion 1>",
    "<improvement suggestion 2>"
  ],
  "suggested_phrases": [
    "<useful academic phrase 1>",
    "<useful academic phrase 2>",
    "<useful academic phrase 3>"
  ]
}}"""
