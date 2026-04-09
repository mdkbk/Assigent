#!/bin/bash
echo "Stopping Assigent..."
pkill -f uvicorn
pkill -f "vite"
echo "✅ Stopped!"
