#!/bin/bash
echo "Starting Assigent..."

cd ~/Desktop/Assigent/backend
source ~/Desktop/Assigent/venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!

cd ~/Desktop/Assigent/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Running!"
echo "   App:     http://localhost:3000"
echo "   API:     http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
