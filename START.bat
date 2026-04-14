@echo off
REM Study App - Auto-Startup Batch File
REM Double-click this file to start the server and open the app in your browser

echo ========================================
echo Study App Dashboard
echo ========================================
echo.
echo Checking for Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found!
echo.
echo Starting server...
echo.

REM Start the server
node start-server.js &

REM Give the server time to start
timeout /t 2 /nobreak

REM Open browser to localhost:8000
REM Using start with delay to ensure server is ready
timeout /t 1 /nobreak
start http://localhost:8000/

REM Keep window open
echo.
echo ========================================
echo Server is running!
echo.
echo The app will open in your browser automatically.
echo.
echo To stop the server, close this window or press Ctrl+C
echo ========================================
echo.
pause
