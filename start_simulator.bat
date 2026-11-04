@echo off
setlocal
cd /d "%~dp0"
title IoT Security Simulator
if /I "%~1"=="--server" goto server
echo Opening the offline IoT Security Dashboard...
start "" "%~dp0OPEN_DASHBOARD.html"
exit /b

:server
echo Starting IoT Security Simulator...
echo Keep this window open while using the dashboard.
echo.

python -c "import sys; assert sys.version_info >= (3, 10)" >nul 2>&1
if not errorlevel 1 (
    python -u iot_security_simulator.py --open-browser
    goto finished
)

py -3 -c "import sys; assert sys.version_info >= (3, 10)" >nul 2>&1
if not errorlevel 1 (
    py -3 -u iot_security_simulator.py --open-browser
    goto finished
)

echo Python 3.10 or newer was not found.
echo Install Python and select "Add python.exe to PATH", then try again.
echo.
:finished
pause
