#!/usr/bin/env python3
"""
run_app.py — start the whole simulator as one local app.

Usage (after a one-time setup):
    pip install -r backend/requirements.txt
    cd frontend && npm install && npm run build && cd ..
    python3 run_app.py

This starts a single process on http://localhost:8000 serving both the
live simulation API (backend/server.py) and the built frontend
(frontend/dist). There is no deployment step and nothing leaves your
machine — this is meant to be cloned from GitHub and run locally. Open
http://localhost:8000 in your browser yourself once the server is up.
"""

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIST = os.path.join(ROOT, "frontend", "dist")
MAP_FILE = os.path.join(BACKEND_DIR, "data", "bhopal_map.json")

HOST = "127.0.0.1"
PORT = 8000


def ensure_map_built():
    """The routing graph (data/bhopal_map.json) is generated, not checked
    in as the primary artifact — build it on first run if missing."""
    if os.path.exists(MAP_FILE):
        return
    print("No routing graph found — building it from the Bhopal basemap...")
    sys.path.insert(0, BACKEND_DIR)
    cwd = os.getcwd()
    os.chdir(BACKEND_DIR)
    try:
        import build_graph
        build_graph.main()
    finally:
        os.chdir(cwd)


def ensure_frontend_built():
    if os.path.isdir(FRONTEND_DIST) and os.listdir(FRONTEND_DIST):
        return
    print(
        "\nNo frontend build found at frontend/dist.\n"
        "Run this once, then re-run this script:\n\n"
        "    cd frontend && npm install && npm run build && cd ..\n"
    )
    sys.exit(1)


def main():
    ensure_map_built()
    ensure_frontend_built()

    sys.path.insert(0, BACKEND_DIR)
    import uvicorn

    print(f"\nBhopal Drone-Delivery Simulator running at http://{HOST}:{PORT}\n"
          f"Open that URL in your browser. Press Ctrl+C to stop.\n")
    uvicorn.run("server:app", host=HOST, port=PORT, app_dir=BACKEND_DIR)


if __name__ == "__main__":
    main()
