<#
.SYNOPSIS
    Launches MyPal with the Electron launcher in development mode.

.DESCRIPTION
    This script ensures all npm dependencies are installed and starts MyPal
    using the Electron launcher. It automatically sets up data directories
    and environment variables for development.

.PARAMETER SkipInstall
    Skip checking and installing npm dependencies. Useful for faster restarts
    when you know dependencies are already installed.

.PARAMETER NoServerConsole
    Prevent the server console window from auto-opening. The console can still
    be opened manually via the system tray menu.

.EXAMPLE
    .\autorun.ps1
    Standard launch with dependency check and server console.

.EXAMPLE
    .\autorun.ps1 -SkipInstall
    Quick launch without checking dependencies.

.EXAMPLE
    .\autorun.ps1 -NoServerConsole
    Launch without auto-opening the server console window.

.EXAMPLE
    .\autorun.ps1 -SkipInstall -NoServerConsole
    Quick launch with no console window.
#>

param(
    [switch]$SkipInstall,
    [switch]$NoServerConsole
)

$ErrorActionPreference = "Stop"

function Ensure-NpmDependencies {
    param(
        [string]$Directory
    )

    $packageJson = Join-Path $Directory "package.json"
    if (-not (Test-Path $packageJson)) {
        Write-Warning "Skipping $Directory (package.json not found)."
        return
    }

    $nodeModules = Join-Path $Directory "node_modules"
    if ($SkipInstall) {
        Write-Host "Skipping dependency check for $Directory (SkipInstall flag used)."
        return
    }

    if (-not (Test-Path $nodeModules)) {
        Write-Host "Installing npm dependencies in $Directory..."
        Push-Location $Directory
        try {
            npm install | Write-Output
        } finally {
            Pop-Location
        }
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "app\backend"
$launcherDir = Join-Path $scriptRoot "launcher"

Ensure-NpmDependencies -Directory $backendDir
Ensure-NpmDependencies -Directory $launcherDir

# Set up data directories
$env:MYPAL_DATA_DIR = Join-Path $scriptRoot "dev-data"
$env:MYPAL_LOGS_DIR = Join-Path $scriptRoot "dev-logs"
$env:MYPAL_MODELS_DIR = Join-Path $scriptRoot "app\backend\models"
$env:MYPAL_FORCE_TELEMETRY = '1'

# Optional: Skip auto-opening server console
if ($NoServerConsole) {
    $env:MYPAL_NO_SERVER_CONSOLE = '1'
    Write-Host "Server console will not auto-open (NoServerConsole flag used)." -ForegroundColor Yellow
}

# Ensure directories exist
@($env:MYPAL_DATA_DIR, $env:MYPAL_LOGS_DIR, $env:MYPAL_MODELS_DIR) | ForEach-Object {
    if (-not (Test-Path $_)) {
        Write-Host "Creating directory: $_"
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MyPal with Electron Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  • Server Console: Auto-opens to show real-time logs" -ForegroundColor White
Write-Host "  • System Tray: Right-click tray icon for menu" -ForegroundColor White
Write-Host "  • Background Mode: Keep server running when window closes" -ForegroundColor White
Write-Host ""
Write-Host "Data Directory: $env:MYPAL_DATA_DIR" -ForegroundColor Gray
Write-Host "Logs Directory: $env:MYPAL_LOGS_DIR" -ForegroundColor Gray
Write-Host ""
Write-Host "Tip: Run '.\autorun.ps1 -NoServerConsole' to skip the console window" -ForegroundColor DarkGray
Write-Host "Tip: Run '.\autorun.ps1 -SkipInstall' for faster restarts" -ForegroundColor DarkGray
Write-Host ""

Push-Location $launcherDir
try {
    npm run dev
} finally {
    Pop-Location
}
