from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from db.database import (
    init_db,
    create_assignment,
    get_assignment,
    list_assignments,
    update_assignment,
    delete_assignment,
)
from models.assignment import Assignment, AssignmentCreate, AssignmentUpdate

app = FastAPI(
    title="Assignment Agent API",
    description="Multi-agent system for tracking, drafting, reviewing, and submitting assignments.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    from scheduler.scheduler import start_scheduler
    start_scheduler(interval_hours=1)


@app.on_event("shutdown")
def shutdown():
    from scheduler.scheduler import stop_scheduler
    stop_scheduler()


# ── Assignments CRUD ───────────────────────────────────────────────────────────
@app.post("/assignments", response_model=Assignment, status_code=201, tags=["assignments"])
def create(data: AssignmentCreate):
    """Create a new assignment and store it."""
    return create_assignment(data)


@app.get("/assignments", response_model=list[Assignment], tags=["assignments"])
def list_all():
    """List all assignments ordered by deadline."""
    return list_assignments()


@app.get("/assignments/{assignment_id}", response_model=Assignment, tags=["assignments"])
def get_one(assignment_id: int):
    a = get_assignment(assignment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


@app.patch("/assignments/{assignment_id}", response_model=Assignment, tags=["assignments"])
def update(assignment_id: int, data: AssignmentUpdate):
    a = update_assignment(assignment_id, data)
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


@app.delete("/assignments/{assignment_id}", status_code=204, tags=["assignments"])
def delete(assignment_id: int):
    if not delete_assignment(assignment_id):
        raise HTTPException(status_code=404, detail="Assignment not found")


# ── Analyzer agent ─────────────────────────────────────────────────────────────
@app.post("/assignments/{assignment_id}/analyze", tags=["agents"])
def analyze(assignment_id: int):
    """Run the requirement analyzer agent on an assignment."""
    from agents.analyzer_agent import analyze_assignment
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = analyze_assignment(assignment_id)
    return {"assignment_id": assignment_id, "analysis": result}


# ── Execution agent ────────────────────────────────────────────────────────────
@app.post("/assignments/{assignment_id}/draft", tags=["agents"])
def draft(assignment_id: int):
    """Run the execution agent to generate a draft solution."""
    from agents.execution_agent import execute_assignment
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = execute_assignment(assignment_id)
    return {"assignment_id": assignment_id, "draft": result}


# ── Review agent ───────────────────────────────────────────────────────────────
@app.post("/assignments/{assignment_id}/review", tags=["agents"])
def review(assignment_id: int):
    """Run the review agent to evaluate the draft like a strict professor."""
    from agents.review_agent import review_assignment
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = review_assignment(assignment_id)
    return {"assignment_id": assignment_id, "review": result}


# ── Submission assistant ───────────────────────────────────────────────────────
@app.post("/assignments/{assignment_id}/submit-prep", tags=["agents"])
def submit_prep(assignment_id: int):
    """Generate final submission checklist and instructions."""
    from agents.submission_agent import prepare_submission
    assignment = get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = prepare_submission(assignment_id)
    return {"assignment_id": assignment_id, "submission_prep": result}


@app.post("/assignments/{assignment_id}/mark-submitted", tags=["agents"])
def mark_submitted(assignment_id: int):
    """Mark assignment as submitted — final step."""
    from agents.submission_agent import mark_submitted as do_mark
    return do_mark(assignment_id)


# ── Reminder agent ─────────────────────────────────────────────────────────────
@app.get("/reminders", tags=["agents"])
def get_reminders():
    """Manually trigger the reminder agent right now."""
    from agents.reminder_agent import check_and_remind
    reminders = check_and_remind(notify=False)
    return [
        {
            "assignment_id": r.assignment_id,
            "title": r.title,
            "urgency": r.urgency,
            "hours_left": round(r.hours_left, 1),
            "deadline": r.deadline.isoformat(),
            "message": r.message,
        }
        for r in reminders
    ]


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health():
    from utils import is_ollama_running, list_local_models
    return {
        "status": "ok",
        "ollama_running": is_ollama_running(),
        "local_models": list_local_models(),
    }


# ── Full pipeline ──────────────────────────────────────────────────────────────
@app.post("/assignments/{assignment_id}/run-pipeline", tags=["agents"])
def run_pipeline(assignment_id: int):
    """Run all agents in sequence: analyze → draft → review → submit-prep."""
    from agents.analyzer_agent import analyze_assignment
    from agents.execution_agent import execute_assignment
    from agents.review_agent import review_assignment
    from agents.submission_agent import prepare_submission

    assignment = get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    print(f"[Pipeline] Starting for assignment #{assignment_id}")

    print("[Pipeline] Step 1/4 — Analyzing requirements...")
    analysis = analyze_assignment(assignment_id)

    print("[Pipeline] Step 2/4 — Generating draft...")
    draft = execute_assignment(assignment_id)

    print("[Pipeline] Step 3/4 — Reviewing draft...")
    review = review_assignment(assignment_id)

    print("[Pipeline] Step 4/4 — Preparing submission checklist...")
    submission = prepare_submission(assignment_id)

    print("[Pipeline] Done!")
    return {
        "assignment_id": assignment_id,
        "analysis": analysis,
        "draft": draft,
        "review": review,
        "submission_prep": submission,
    }