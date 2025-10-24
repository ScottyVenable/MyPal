@echo off
REM MyPal Launcher Batch Script
REM Launches AUTORUN.ps1 in PowerShell

setlocal

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Check if AUTORUN.ps1 exists
if not exist "%SCRIPT_DIR%AUTORUN.ps1" (
    echo Error: AUTORUN.ps1 not found in %SCRIPT_DIR%
    echo.
    echo Please ensure you are running this from the MyPal root directory.
    pause
    exit /b 1
)

REM Launch PowerShell with AUTORUN.ps1
REM -NoExit keeps the window open
REM -ExecutionPolicy Bypass allows the script to run
REM -File specifies the script to execute

powershell.exe -NoExit -ExecutionPolicy Bypass -File "%SCRIPT_DIR%AUTORUN.ps1"

endlocal
