import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logging.getLogger("apscheduler").setLevel(logging.WARNING)

_scheduler = None


def _run_reminders():
    from agents.reminder_agent import check_and_remind
    try:
        reminders = check_and_remind(notify=True)
        if not reminders:
            print("[Scheduler] No urgent deadlines at this check.")
    except Exception as e:
        print(f"[Scheduler] Reminder agent error: {e}")


def start_scheduler(interval_hours=1):
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _run_reminders,
        trigger=IntervalTrigger(hours=interval_hours),
        id="reminder_check",
        name="Deadline Reminder",
        replace_existing=True,
    )
    _scheduler.start()
    _run_reminders()
    print(f"[Scheduler] Started — checking every {interval_hours}h.")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("[Scheduler] Stopped.")