@echo off
REM Simple HTTP Server for Study Dashboard
REM This script starts a local web server to test the application

cd /d "%~dp0"

echo ========================================
echo Study Dashboard - Local Server
echo ========================================
echo.
echo Starting local server...
echo Open your browser and navigate to:
echo http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server 8000

if errorlevel 1 (
    echo.
    echo If Python is not installed or not in PATH:
    echo 1. Install Python from python.org
    echo 2. Or use your browser to open: index.html directly
    echo.
    pause
)
