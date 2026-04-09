import json
from db.database import get_assignment, update_assignment
from models.assignment import AssignmentStatus, AssignmentUpdate
from utils.llm import chat

SYSTEM_PROMPT = """You are a submission assistant helping a student prepare their final assignment.
Return ONLY a valid JSON object with exactly these keys:
{
  "checklist": [
    "checklist item 1",
    "checklist item 2"
  ],
  "file_naming": "suggested_filename.pdf",
  "submission_steps": ["step 1", "step 2"],
  "warnings": ["any last minute warnings"]
}
No markdown, no code fences, just raw JSON."""


def prepare_submission(assignment_id: int) -> dict:
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    if not assignment.draft:
        raise ValueError("No draft found. Run /draft first.")

    review = {}
    if assignment.review:
        try:
            review = json.loads(assignment.review)
        except json.JSONDecodeError:
            pass

    user_message = f"""Assignment title: {assignment.title}
Task type: {assignment.task_type}
Deadline: {assignment.deadline}
Requirements: {assignment.requirements}

Professor review score: {review.get("score", "N/A")}/10
Suggestions to address: {json.dumps(review.get("suggestions", []))}
Weak areas: {json.dumps(review.get("weak_areas", []))}

Generate a final submission checklist, file naming convention, submission steps, and any last warnings."""

    raw = chat(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        timeout=120,
    )

    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "checklist": [
                "Review draft one final time",
                "Check all requirements are met",
                "Verify formatting is correct",
                "Save as PDF before submitting",
                "Submit before deadline",
            ],
            "file_naming": f"{assignment.title.lower().replace(' ', '_')}.pdf",
            "submission_steps": ["Export to PDF", "Upload to portal", "Confirm submission"],
            "warnings": ["Double check the deadline timezone"],
        }

    return result


def mark_submitted(assignment_id: int) -> dict:
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")
    update_assignment(assignment_id, AssignmentUpdate(status=AssignmentStatus.SUBMITTED))
    return {"assignment_id": assignment_id, "status": "submitted", "message": "Assignment marked as submitted!"}
