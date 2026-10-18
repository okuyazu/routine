@echo off
REM Double-click this to run My Benchmarks on your PC.
REM It starts the local server; leave this window open while you use the app.
cd /d "%~dp0"
echo Starting My Benchmarks server...
echo Open http://localhost:8777 in your browser.
echo Close this window (or press Ctrl+C) to stop.
echo.
python server.py
pause
