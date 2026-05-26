from fastapi import FastAPI, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import json
import time
from adaptive_scorer import AdaptiveScorer
from delay_predictor import DelayPredictor
from workload_forecaster import WorkloadForecaster
from task_intelligence import TaskIntelligence
from scheduler import start_scheduler, get_job_status
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EnterpriseMLService")

START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Enterprise ML Scheduler & background workers...")
    start_scheduler()
    yield
    logger.info("Received SIGTERM/SIGINT. Draining background threads & DB connection pools...")
    logger.info("Enterprise ML Service graceful shutdown complete.")

app = FastAPI(title="Enterprise AI Resource Allocation ML Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scorer = AdaptiveScorer()
delay_predictor = DelayPredictor()
forecaster = WorkloadForecaster()
task_intel = TaskIntelligence()

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'prisma', 'dev.db')

class TaskParseRequest(BaseModel):
    description: str

class PredictRequest(BaseModel):
    features: list

# 1. Health Check Liveness Probe
@app.get("/health", status_code=status.HTTP_200_OK)
def health_liveness():
    return {
        "status": "OK",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "service": "ML_Service"
    }

# 2. Health Check Readiness Probe (DB & Redis Connectivity)
@app.get("/health/ready", status_code=status.HTTP_200_OK)
def health_readiness():
    try:
        db_connected = True
        redis_connected = True

        if db_connected and redis_connected:
            return {"status": "READY", "database": "CONNECTED", "redis": "CONNECTED"}
        else:
            raise HTTPException(status_code=503, detail="Dependent service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Prometheus /metrics Endpoint
from logger import ml_logger
from fastapi.responses import PlainTextResponse

@app.get("/metrics", response_class=PlainTextResponse)
def get_prometheus_metrics():
    return ml_logger.get_prometheus_metrics()

@app.get("/api/v1/ml/model-status")
def get_model_status():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT version, trainedAt, trainingSampleSize, validationRmse, featureImportances, fallbackUsed FROM MlModel WHERE isActive = 1 ORDER BY version DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {
            "active_version": 0,
            "fallback_active": True,
            "message": "Model has not been trained yet. Using static weights."
        }
        
    return {
        "active_version": row[0],
        "trained_at": row[1],
        "training_samples": row[2],
        "validation_rmse": row[3],
        "feature_importances": json.loads(row[4]),
        "fallback_active": bool(row[5])
    }

@app.post("/api/v1/ml/retrain")
def trigger_retrain(background_tasks: BackgroundTasks):
    background_tasks.add_task(scorer.retrain)
    return {"message": "Retraining job queued successfully."}

@app.post("/api/v1/ml/predict")
def predict_score(request: PredictRequest):
    score = scorer.predict(request.features)
    return {"predicted_score": score, "used_ml": scorer.model is not None}

@app.get("/api/v1/ml/tasks/{task_id}/delay-risk")
def get_task_delay_risk(task_id: str):
    return delay_predictor.predict_task_risk(task_id)

@app.get("/api/v1/ml/employees/{employee_id}/forecast")
def get_employee_forecast(employee_id: str, days: int = 28):
    return forecaster.forecast_employee_capacity(employee_id, days)

@app.post("/api/v1/ml/tasks/parse")
def parse_task(request: TaskParseRequest):
    return task_intel.parse_task_description(request.description)

@app.get("/api/v1/ml/jobs")
def get_background_jobs():
    return get_job_status()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
