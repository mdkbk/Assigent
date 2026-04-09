from datetime import datetime
from dataclasses import dataclass
from db.database import list_assignments
from models.assignment import AssignmentStatus
from utils.llm import chat


@dataclass
class Reminder:
    assignment_id: int
    title: str
    deadline: datetime
    hours_left: float
    urgency: str
    message: str


SYSTEM_PROMPT = """You are a productivity coach. Write ONE short motivating reminder (2-3 sentences). Plain text only."""


def _urgency(hours_left):
    if hours_left < 24:  return "CRITICAL"
    if hours_left < 48:  return "HIGH"
    if hours_left < 168: return "MEDIUM"
    return "LOW"


def _hours_left(deadline):
    delta = deadline - datetime.now()
    return max(delta.total_seconds() / 3600, 0)


def check_and_remind(notify=True):
    assignments = list_assignments()
    reminders = []
    active = [a for a in assignments if a.status not in (AssignmentStatus.SUBMITTED,)]
    for assignment in active:
        hours = _hours_left(assignment.deadline)
        urgency = _urgency(hours)
        if urgency == "LOW":
            continue
        try:
            message = chat(
                system_prompt=SYSTEM_PROMPT,
                user_message=f"Assignment: {assignment.title}\nHours remaining: {hours:.1f}\nUrgency: {urgency}\nWrite a reminder.",
            )
        except RuntimeError as e:
            message = f"[Ollama not available: {e}]"
        r = Reminder(assignment.id, assignment.title, assignment.deadline, hours, urgency, message.strip())
        reminders.append(r)
        if notify:
            print(f"\n[{r.urgency}] {r.title} — {r.hours_left:.1f}h left\n{r.message}")
    return reminders
