import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from models.assignment import Assignment, AssignmentCreate, AssignmentStatus, AssignmentUpdate

DB_PATH = Path(__file__).parent.parent / "db" / "assignments.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


# ── Bootstrap ──────────────────────────────────────────────────────────────────
def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS assignments (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                deadline    TEXT    NOT NULL,
                requirements TEXT   NOT NULL,
                task_type   TEXT    NOT NULL DEFAULT 'other',
                status      TEXT    NOT NULL DEFAULT 'pending',
                analysis    TEXT,
                draft       TEXT,
                review      TEXT,
                final       TEXT,
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            )
        """)
        conn.commit()
    print(f"[DB] Initialised at {DB_PATH}")


@contextmanager
def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ── Helpers ────────────────────────────────────────────────────────────────────
def _row_to_model(row: sqlite3.Row) -> Assignment:
    return Assignment(**dict(row))


# ── CRUD ───────────────────────────────────────────────────────────────────────
def create_assignment(data: AssignmentCreate) -> Assignment:
    now = datetime.now().isoformat()
    with _conn() as conn:
        cur = conn.execute(
            """INSERT INTO assignments
               (title, deadline, requirements, task_type, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                data.title,
                data.deadline.isoformat(),
                data.requirements,
                data.task_type.value,
                AssignmentStatus.PENDING.value,
                now,
                now,
            ),
        )
        conn.commit()
        return get_assignment(cur.lastrowid)


def get_assignment(assignment_id: int) -> Optional[Assignment]:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM assignments WHERE id = ?", (assignment_id,)
        ).fetchone()
        return _row_to_model(row) if row else None


def list_assignments() -> list[Assignment]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM assignments ORDER BY deadline ASC"
        ).fetchall()
        return [_row_to_model(r) for r in rows]


def update_assignment(assignment_id: int, data: AssignmentUpdate) -> Optional[Assignment]:
    fields = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not fields:
        return get_assignment(assignment_id)

    fields["updated_at"] = datetime.now().isoformat()

    # Convert enums to string values
    for k, v in fields.items():
        if hasattr(v, "value"):
            fields[k] = v.value

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [assignment_id]

    with _conn() as conn:
        conn.execute(
            f"UPDATE assignments SET {set_clause} WHERE id = ?", values
        )
        conn.commit()

    return get_assignment(assignment_id)


def delete_assignment(assignment_id: int) -> bool:
    with _conn() as conn:
        cur = conn.execute(
            "DELETE FROM assignments WHERE id = ?", (assignment_id,)
        )
        conn.commit()
        return cur.rowcount > 0


def get_upcoming_deadlines(within_hours: int = 48) -> list[Assignment]:
    """Return assignments that are due within `within_hours` and not submitted."""
    from datetime import timedelta
    cutoff = (datetime.now() + timedelta(hours=within_hours)).isoformat()
    now = datetime.now().isoformat()
    with _conn() as conn:
        rows = conn.execute(
            """SELECT * FROM assignments
               WHERE deadline <= ?
                 AND deadline >= ?
                 AND status NOT IN ('submitted')
               ORDER BY deadline ASC""",
            (cutoff, now),
        ).fetchall()
        return [_row_to_model(r) for r in rows]