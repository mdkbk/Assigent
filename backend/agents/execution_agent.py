import json
from db.database import get_assignment, update_assignment
from models.assignment import AssignmentStatus, AssignmentUpdate
from utils.llm import chat

SYSTEM_PROMPT = """You are a highly skilled student completing an assignment.
Generate a thorough, well-structured draft solution that:
- Strictly follows all requirements
- Matches the task type (essay/coding/math/report etc.)
- Is clearly organized with sections where appropriate
- Leaves room for human review and editing
- Does NOT say it is AI generated
Write the draft directly. No preamble like 'Here is your draft'."""


def execute_assignment(assignment_id: int) -> str:
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    analysis = {}
    if assignment.analysis:
        try:
            analysis = json.loads(assignment.analysis)
        except json.JSONDecodeError:
            pass

    update_assignment(assignment_id, AssignmentUpdate(status=AssignmentStatus.DRAFTING))

    user_message = f"""Assignment title: {assignment.title}
Task type: {assignment.task_type}
Requirements:
{assignment.requirements}

Analysis:
{json.dumps(analysis, indent=2) if analysis else "Not available"}

Generate a complete, high-quality draft solution now."""

    draft = chat(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        timeout=600,
    )

    update_assignment(assignment_id, AssignmentUpdate(
        status=AssignmentStatus.REVIEWING,
        draft=draft.strip(),
    ))

    return draft.strip()
