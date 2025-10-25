<#
.SYNOPSIS
    Quick helper script to start the MyPal backend server in a persistent window.

.DESCRIPTION
    Launches the backend server in a separate PowerShell window that stays open
    even if the server crashes. Useful for quick restarts during development.

.EXAMPLE
    .\start-backend.ps1
    Starts the backend in a new window.
#>

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "app\backend"

if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found: $backendDir"
    exit 1
}

Write-Host "Starting MyPal Backend Server..." -ForegroundColor Cyan
Write-Host "Directory: $backendDir" -ForegroundColor Gray
Write-Host ""

# Start backend in a new PowerShell window with NoExit so it stays open
Start-Process -FilePath "powershell.exe" `
    -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$backendDir'; Write-Host 'MyPal Backend Server' -ForegroundColor Cyan; Write-Host 'Directory: $backendDir' -ForegroundColor Gray; Write-Host ''; npm run dev"
    )

Write-Host "Backend window opened!" -ForegroundColor Green
Write-Host "The backend server will start in the new window." -ForegroundColor Gray
Write-Host "Keep that window open to maintain the backend connection." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend should be available at: http://localhost:3001" -ForegroundColor Cyan
