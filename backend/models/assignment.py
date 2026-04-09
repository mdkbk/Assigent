from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class AssignmentStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    DRAFTING = "drafting"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    SUBMITTED = "submitted"


class TaskType(str, Enum):
    ESSAY = "essay"
    CODING = "coding"
    REPORT = "report"
    MATH = "math"
    PRESENTATION = "presentation"
    OTHER = "other"


# ── What you send to CREATE an assignment ──────────────────────────────────────
class AssignmentCreate(BaseModel):
    title: str
    deadline: datetime
    requirements: str
    task_type: TaskType = TaskType.OTHER

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Data Structures Assignment 3",
                "deadline": "2026-04-15T23:59:00",
                "requirements": "Implement a balanced BST with insert, delete, and search operations in Python. Include unit tests and a brief write-up explaining your design decisions.",
                "task_type": "coding",
            }
        }
    }


# ── Full assignment record (includes DB fields) ────────────────────────────────
class Assignment(AssignmentCreate):
    id: int
    status: AssignmentStatus = AssignmentStatus.PENDING
    analysis: Optional[str] = None       # JSON string from analyzer agent
    draft: Optional[str] = None          # Raw draft text
    review: Optional[str] = None         # JSON string from review agent
    final: Optional[str] = None          # Human-approved final version
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    model_config = {"from_attributes": True}


# ── Partial update ─────────────────────────────────────────────────────────────
class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    deadline: Optional[datetime] = None
    requirements: Optional[str] = None
    task_type: Optional[TaskType] = None
    status: Optional[AssignmentStatus] = None
    draft: Optional[str] = None
    final: Optional[str] = None