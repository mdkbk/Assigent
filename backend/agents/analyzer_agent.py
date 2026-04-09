import json
from db.database import get_assignment, update_assignment
from models.assignment import AssignmentStatus, AssignmentUpdate
from utils.llm import chat

SYSTEM_PROMPT = """You are an academic assistant. Analyze assignment instructions and return ONLY valid JSON.
No explanation, no markdown, no code fences. Just the raw JSON object with these exact keys:
{
  "task_type": "essay|coding|report|math|presentation|other",
  "key_requirements": ["requirement 1", "requirement 2"],
  "evaluation_criteria": ["criterion 1", "criterion 2"],
  "output_format": "description of expected output format",
  "constraints": ["constraint 1", "constraint 2"],
  "estimated_hours": 2
}"""


def analyze_assignment(assignment_id: int) -> dict:
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    update_assignment(assignment_id, AssignmentUpdate(status=AssignmentStatus.ANALYZING))

    user_message = f"""Assignment title: {assignment.title}
Task type hint: {assignment.task_type}
Instructions:
{assignment.requirements}

Return the JSON analysis now."""

    raw = chat(system_prompt=SYSTEM_PROMPT, user_message=user_message, timeout=120)

    # Strip any accidental markdown fences
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        analysis = json.loads(cleaned)
    except json.JSONDecodeError:
        analysis = {
            "task_type": assignment.task_type,
            "key_requirements": ["See original instructions"],
            "evaluation_criteria": ["Completeness", "Accuracy"],
            "output_format": "As specified in instructions",
            "constraints": [],
            "estimated_hours": 2,
            "raw_response": raw,
        }

    update_assignment(assignment_id, AssignmentUpdate(
        status=AssignmentStatus.DRAFTING,
        analysis=json.dumps(analysis),
    ))

    return analysis
