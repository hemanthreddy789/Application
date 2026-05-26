# AI Resource Allocation Assistant (V2 Enterprise Edition)

“Intelligent workforce planning — assign the right work to the right people at the right time, driven by Machine Learning.”

## Overview
This application is a highly scalable, AI-powered resource allocation and workforce planning system. It helps enterprise managers assign tasks to the most suitable employees by leveraging predictive analytics, machine learning, and intelligent automation. The system actively learns from manager decisions to improve future recommendations.

## Hybrid Microservice Architecture
To ensure high performance and scalability, the application is divided into three distinct layers:
1. **Frontend**: React + TypeScript, Vite, Tailwind CSS, Recharts
2. **Core API Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite
3. **Machine Learning Microservice**: Python, FastAPI, Scikit-Learn, Pandas, APScheduler

## Project Structure
- `/frontend` - React SPA (User Interface)
- `/backend` - Express API & Prisma database schema (Core Business Logic)
- `/ml_service` - Python FastAPI Server (Predictive Models & AI Parsers)

## Key Features (V2 Upgrades)
- **🧠 Task Intelligence (NLP)**: Auto-parses plain English task descriptions to extract required skills, complexity, and estimated hours.
- **🎯 ML Adaptive Scoring**: Replaces static formulas with a `GradientBoostingRegressor` that actively learns from past successful task assignments and manager overrides.
- **🔮 Intelligent Delay Predictor**: Uses a `RandomForestClassifier` to analyze active tasks and flag "At-Risk" projects before deadlines are missed.
- **📈 Smart Workload Forecasting**: Simulates future capacity constraints over a 28-day window to highlight "Peak Overload Risks" and "Best Assignment Windows".
- **🔁 Continuous Learning Feedback Loop**: Captures whenever a manager overrides an AI recommendation to intelligently self-correct its future suggestions.
- **📊 Advanced Analytics Dashboard**: Real-time Recharts dashboards showing Model Accuracy, Manager Time Saved (ROI), and Workload Distributions.
- **⚙️ Background Job Scheduler**: Automated nightly `APScheduler` tasks for model retraining and workload snapshotting.

## Setup Instructions

To run the full V2 stack locally, you will need to open **three separate terminals**.

### 1. Core API Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
*Runs on `http://localhost:5000`*

### 2. Python ML Microservice
It is recommended to use a virtual environment (`python -m venv venv`).
```bash
cd ml_service
pip install -r requirements.txt
python main.py
```
*Runs on `http://localhost:8000`*

### 3. Frontend App
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:3000`*

## Roadmap to Full Production
This MVP is highly robust but optimized for local development. To deploy to an enterprise environment:
1. **Database:** Change the Prisma provider from `sqlite` to `postgresql`.
2. **Authentication:** Implement real Auth0/JWT integration (currently bypassed for the MVP).
3. **LLM Integration:** Replace the intelligent mock parser in `task_intelligence.py` with an actual Anthropic Claude or OpenAI API key.
4. **Task Queue:** Migrate `APScheduler` to `Celery + Redis` for distributed background jobs across multiple load-balanced server instances.
