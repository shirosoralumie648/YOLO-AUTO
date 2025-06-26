#!/bin/bash

# This script starts the development environment for YOLO-AUTO.
# It launches both the frontend and backend servers concurrently.

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to clean up background processes on exit
cleanup() {
    echo "\nShutting down servers..."
    # Kill all background jobs of this script
    kill $(jobs -p) 2>/dev/null
    echo "Done."
}

# Trap the EXIT signal to run the cleanup function when the script is terminated
trap cleanup EXIT

echo "🚀 Starting YOLO-AUTO development environment..."

# --- Start Backend Server ---
echo "[Backend] Navigating to backend directory..."
cd backend
echo "[Backend] Starting FastAPI server with uvicorn..."
# Note: Make sure your Python environment (like Conda or venv) is activated
# before running this script.
uvicorn app.main:app --reload --port 8000 &
cd ..

# --- Start Frontend Server ---
echo "[Frontend] Navigating to frontend directory..."
cd frontend/dashboard
echo "[Frontend] Starting Vite development server..."
npm run dev &
cd ../..


echo "\n✅ Both servers are starting up."
echo "   - Backend (FastAPI) will be on http://localhost:8000"
echo "   - Frontend (Vite) will be on http://localhost:5173"
echo "\nPress Ctrl+C to shut down all servers."

# Wait for all background processes to finish. 
# The 'wait' command will pause the script here until a signal (like Ctrl+C) is received.
wait
