from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from adaptive_scorer import AdaptiveScorer

scorer = AdaptiveScorer()

def daily_model_retraining():
    print(f"[{datetime.utcnow().isoformat()}] Running Background Job: Daily Model Retraining...")
    try:
        result = scorer.retrain()
        print(f"Retraining Result: {result}")
    except Exception as e:
        print(f"Retraining Failed: {e}")

def daily_capacity_snapshot():
    print(f"[{datetime.utcnow().isoformat()}] Running Background Job: Daily Capacity Snapshot...")
    # In a real app, this would query Prisma DB and insert into AnalyticsCache or WorkloadSnapshot
    print("Snapshot captured successfully.")

scheduler = BackgroundScheduler()

def start_scheduler():
    # Schedule retraining every day at 2:00 AM
    scheduler.add_job(
        daily_model_retraining,
        trigger=CronTrigger(hour=2, minute=0),
        id="daily_retraining",
        name="Daily ML Model Retraining",
        replace_existing=True
    )

    # Schedule capacity snapshot every day at 11:55 PM
    scheduler.add_job(
        daily_capacity_snapshot,
        trigger=CronTrigger(hour=23, minute=55),
        id="capacity_snapshot",
        name="Daily Capacity Snapshot",
        replace_existing=True
    )
    
    scheduler.start()
    print("Background Scheduler started successfully.")

def get_job_status():
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "is_paused": job.next_run_time is None
        })
    return {"status": "running" if scheduler.running else "stopped", "jobs": jobs}
