@echo off
REM ============================================================================
REM  run_app.bat - double-click launcher for Windows.
REM
REM  First run: creates a Python virtual environment, installs backend deps,
REM  installs + builds the frontend, builds the routing graph.
REM  Every run after that: just starts the app (fast).
REM
REM  Requires Python 3.10+ and Node.js to already be installed and on PATH.
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo   Bhopal Drone-Delivery Simulator
echo   ================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    where python3 >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Python was not found on PATH. Install Python 3.10+ from
        echo         https://www.python.org/downloads/ and make sure "Add to PATH"
        echo         is checked during install, then run this file again.
        pause
        exit /b 1
    )
    set PY=python3
) else (
    set PY=python
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH. Install it from
    echo         https://nodejs.org/ then run this file again.
    pause
    exit /b 1
)

REM --- 1. Python virtual environment + backend deps -------------------------
if not exist "backend\.venv\Scripts\python.exe" (
    echo [1/4] Creating Python virtual environment...
    %PY% -m venv backend\.venv
    if errorlevel 1 (
        echo [ERROR] Failed to create the virtual environment.
        pause
        exit /b 1
    )
    echo [1/4] Installing backend dependencies ^(fastapi, uvicorn^)...
    backend\.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
    backend\.venv\Scripts\python.exe -m pip install --quiet -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
) else (
    echo [1/4] Backend virtual environment already set up - skipping.
)

REM --- 2. Frontend install ----------------------------------------------------
if not exist "frontend\node_modules" (
    echo [2/4] Installing frontend dependencies ^(this can take a minute^)...
    pushd frontend
    call npm install --silent
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    popd
) else (
    echo [2/4] Frontend dependencies already installed - skipping.
)

REM --- 3. Frontend build -------------------------------------------------------
if not exist "frontend\dist\index.html" (
    echo [3/4] Building the frontend...
    pushd frontend
    call npm run build
    if errorlevel 1 (
        popd
        echo [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
    popd
) else (
    echo [3/4] Frontend already built - skipping. ^(Delete frontend\dist to force a rebuild.^)
)

REM --- 4. Start the app --------------------------------------------------------
echo [4/4] Starting the simulator...
echo.
backend\.venv\Scripts\python.exe run_app.py

pause
