import json
from db.database import get_assignment, update_assignment
from models.assignment import AssignmentStatus, AssignmentUpdate
from utils.llm import chat

SYSTEM_PROMPT = """You are a strict professor evaluating a student's draft assignment.
Return ONLY valid JSON with exactly these keys:
{
  "score": 8,
  "missing_elements": ["element 1", "element 2"],
  "weak_areas": ["weak area 1", "weak area 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "overall_feedback": "One paragraph summary of the draft quality."
}
No markdown, no code fences, just raw JSON."""


def review_assignment(assignment_id: int) -> dict:
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    if not assignment.draft:
        raise ValueError("No draft found. Run /draft first.")

    analysis = {}
    if assignment.analysis:
        try:
            analysis = json.loads(assignment.analysis)
        except json.JSONDecodeError:
            pass

    update_assignment(assignment_id, AssignmentUpdate(status=AssignmentStatus.REVIEWING))

    user_message = f"""Assignment title: {assignment.title}

Original requirements:
{assignment.requirements}

Extracted analysis:
{json.dumps(analysis, indent=2) if analysis else "Not available"}

Student draft to evaluate:
{assignment.draft}

Evaluate this draft strictly and return your JSON review."""

    raw = chat(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        timeout=180,
    )

    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        review = json.loads(cleaned)
    except json.JSONDecodeError:
        review = {
            "score": 7,
            "missing_elements": [],
            "weak_areas": ["Could not parse review"],
            "suggestions": ["Review the draft manually"],
            "overall_feedback": raw,
        }

    update_assignment(assignment_id, AssignmentUpdate(
        status=AssignmentStatus.APPROVED,
        review=json.dumps(review),
    ))

    return review
