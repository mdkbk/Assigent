# Assignment Agent

AI-powered academic co-pilot built with FastAPI + Ollama (free, runs locally).

## Features
- Tracks assignment deadlines with automatic reminders
- Analyzes assignment requirements using local LLM
- Generates draft solutions
- Reviews drafts like a strict professor
- Submission checklist

## Stack
- Backend: Python + FastAPI
- LLM: Ollama (llama3.2) — free, runs locally
- Database: SQLite
- Frontend: React + Vite

## Setup
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Usage
Open http://localhost:3000
