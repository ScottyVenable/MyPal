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

function Start-LogConsole {
    param(
        [string]$LogFile,
        [string]$WorkingDirectory
    )

    if (-not (Test-Path $LogFile)) {
        New-Item -ItemType File -Path $LogFile -Force | Out-Null
    }

    $commandScript = @'
& {
    param($logPath, $rootDir)
    try { Set-Location $rootDir } catch {}
    Clear-Host
    if ($Host.Name -eq 'ConsoleHost') {
        try { $host.UI.RawUI.WindowTitle = "MyPal Live Log" } catch {}
    }
    Write-Host '=== MyPal Live Log ===' -ForegroundColor Cyan
    Write-Host -ForegroundColor DarkGray ("Watching: {0}" -f $logPath)
    Write-Host -ForegroundColor DarkGray 'Press Ctrl+C to close this window.'
    Write-Host ''
    Get-Content -Path $logPath -Wait -Tail 200
}
'@

    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoExit", "-Command", $commandScript, "`"$LogFile`"", "`"$WorkingDirectory`"" | Out-Null
}

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
Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MyPal with Electron Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  - Server Console: Auto-opens to show real-time logs" -ForegroundColor White
Write-Host "  - System Tray: Right-click tray icon for menu" -ForegroundColor White
Write-Host "  - Background Mode: Keep server running when window closes" -ForegroundColor White
Write-Host ""
Write-Host "Data Directory: $env:MYPAL_DATA_DIR" -ForegroundColor Gray
Write-Host "Logs Directory: $env:MYPAL_LOGS_DIR" -ForegroundColor Gray
Write-Host ""
Write-Host "Tip: Run '.\autorun.ps1 -NoServerConsole' to skip the console window" -ForegroundColor DarkGray
Write-Host "Tip: Run '.\autorun.ps1 -SkipInstall' for faster restarts" -ForegroundColor DarkGray
Write-Host ""

# Interactive mode selection
Write-Host "Select launch mode:" -ForegroundColor Cyan
Write-Host "  [1] Development (default - uses dev-data, dev-logs)" -ForegroundColor White
Write-Host "  [2] Production (uses production data directories)" -ForegroundColor White
Write-Host "  [3] Custom (configure paths and options)" -ForegroundColor White
Write-Host ""
$modeChoice = Read-Host "Enter choice [1-3] (press Enter for default)"

if ([string]::IsNullOrWhiteSpace($modeChoice)) {
    $modeChoice = "1"
}

switch ($modeChoice) {
    "2" {
        # Production mode
        Write-Host "`nProduction Mode Selected" -ForegroundColor Green
        $env:MYPAL_DATA_DIR = Join-Path $scriptRoot "data"
        $env:MYPAL_LOGS_DIR = Join-Path $scriptRoot "logs"
        $env:MYPAL_MODELS_DIR = Join-Path $scriptRoot "app\backend\models"
        $env:MYPAL_FORCE_TELEMETRY = '0'
        $env:NODE_ENV = 'production'
    }
    "3" {
        # Custom mode
        Write-Host "`nCustom Mode - Configure Options" -ForegroundColor Yellow
        Write-Host ""
        
        # Data directory
        Write-Host "Current data directory: $env:MYPAL_DATA_DIR" -ForegroundColor Gray
        $customData = Read-Host "Enter custom data directory (press Enter to keep current)"
        if (-not [string]::IsNullOrWhiteSpace($customData)) {
            $env:MYPAL_DATA_DIR = $customData
        }
        
        # Logs directory
        Write-Host "Current logs directory: $env:MYPAL_LOGS_DIR" -ForegroundColor Gray
        $customLogs = Read-Host "Enter custom logs directory (press Enter to keep current)"
        if (-not [string]::IsNullOrWhiteSpace($customLogs)) {
            $env:MYPAL_LOGS_DIR = $customLogs
        }
        
        # Port
        Write-Host "Current port: 3001 (default)" -ForegroundColor Gray
        $customPort = Read-Host "Enter custom port (press Enter for default)"
        if (-not [string]::IsNullOrWhiteSpace($customPort)) {
            $env:PORT = $customPort
        }
        
        # Telemetry
        Write-Host "Enable telemetry? [Y/n]" -ForegroundColor Gray
        $telemetryChoice = Read-Host
        if ($telemetryChoice -eq "n" -or $telemetryChoice -eq "N") {
            $env:MYPAL_FORCE_TELEMETRY = '0'
        } else {
            $env:MYPAL_FORCE_TELEMETRY = '1'
        }
        
        Write-Host "`nCustom configuration applied" -ForegroundColor Green
    }
    default {
        # Development mode (default)
        Write-Host "`nDevelopment Mode Selected" -ForegroundColor Green
    }
}

# Re-ensure directories in case paths changed above
@($env:MYPAL_DATA_DIR, $env:MYPAL_LOGS_DIR, $env:MYPAL_MODELS_DIR) | ForEach-Object {
    if (-not (Test-Path $_)) {
        Write-Host "Creating directory: $_"
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Ask about running pre-launch commands
Write-Host ""
Write-Host "Run pre-launch commands? [y/N]" -ForegroundColor Cyan
$runCommands = Read-Host
if ($runCommands -eq "y" -or $runCommands -eq "Y") {
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  [1] Clear data directory" -ForegroundColor White
    Write-Host "  [2] Clear logs directory" -ForegroundColor White
    Write-Host "  [3] Rebuild node_modules (npm install)" -ForegroundColor White
    Write-Host "  [4] Run tests" -ForegroundColor White
    Write-Host "  [5] Skip" -ForegroundColor White
    Write-Host ""
    $cmdChoice = Read-Host "Enter choice [1-5]"
    
    switch ($cmdChoice) {
        "1" {
            Write-Host "Clearing data directory..." -ForegroundColor Yellow
            if (Test-Path $env:MYPAL_DATA_DIR) {
                Remove-Item -Path "$env:MYPAL_DATA_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "Data directory cleared" -ForegroundColor Green
            }
        }
        "2" {
            Write-Host "Clearing logs directory..." -ForegroundColor Yellow
            if (Test-Path $env:MYPAL_LOGS_DIR) {
                Remove-Item -Path "$env:MYPAL_LOGS_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "Logs directory cleared" -ForegroundColor Green
            }
        }
        "3" {
            Write-Host "Rebuilding dependencies..." -ForegroundColor Yellow
            Push-Location $backendDir
            try {
                Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
                npm install
            } finally {
                Pop-Location
            }
            Push-Location $launcherDir
            try {
                Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
                npm install
            } finally {
                Pop-Location
            }
            Write-Host "Dependencies rebuilt" -ForegroundColor Green
        }
        "4" {
            Write-Host "Running tests..." -ForegroundColor Yellow
            Push-Location $backendDir
            try {
                npm test
            } finally {
                Pop-Location
            }
        }
        default {
            Write-Host "Skipping pre-launch commands" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "Final configuration:" -ForegroundColor Cyan
Write-Host "  Data: $env:MYPAL_DATA_DIR" -ForegroundColor White
Write-Host "  Logs: $env:MYPAL_LOGS_DIR" -ForegroundColor White
if ($env:PORT) {
    Write-Host "  Port: $env:PORT" -ForegroundColor White
}
$shouldOpenLogConsole = -not $NoServerConsole
$consoleLogFile = Join-Path $env:MYPAL_LOGS_DIR "console.log"
if ($shouldOpenLogConsole) {
    Write-Host "  Live log console: enabled" -ForegroundColor White
} else {
    Write-Host "  Live log console: disabled (-NoServerConsole flag supplied)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Select frontend experience:" -ForegroundColor Cyan
Write-Host "  [1] Legacy HTML (Electron launcher)" -ForegroundColor White
Write-Host "  [2] Avalonia Desktop (new preview)" -ForegroundColor White
Write-Host ""
$frontendChoice = Read-Host "Enter choice [1-2] (press Enter for default)"
if ([string]::IsNullOrWhiteSpace($frontendChoice)) {
    $frontendChoice = "1"
}

Write-Host ""
switch ($frontendChoice) {
    "2" {
        Write-Host "Launching MyPal Avalonia desktop client..." -ForegroundColor Green
        $desktopProject = Join-Path $scriptRoot "app\desktop\MyPal.Desktop\MyPal.Desktop.csproj"
        if (-not (Test-Path $desktopProject)) {
            Write-Error "Avalonia project not found at $desktopProject"
            exit 1
        }

        $desktopDir = Split-Path $desktopProject -Parent
        $avaloniaProcess = Start-Process -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory $desktopDir -PassThru
        if ($shouldOpenLogConsole) {
            Start-Sleep -Seconds 1
            Write-Host "Opening live log console window..." -ForegroundColor Cyan
            Start-LogConsole -LogFile $consoleLogFile -WorkingDirectory $scriptRoot
        }
        try {
            Wait-Process -Id $avaloniaProcess.Id
        } catch {
            Write-Warning "Avalonia process ended unexpectedly."
        }
    }
    default {
        Write-Host "Launching MyPal Electron (legacy HTML frontend)..." -ForegroundColor Green
        $electronProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $launcherDir -PassThru
        if ($shouldOpenLogConsole) {
            Start-Sleep -Seconds 1
            Write-Host "Opening live log console window..." -ForegroundColor Cyan
            Start-LogConsole -LogFile $consoleLogFile -WorkingDirectory $scriptRoot
        }
        try {
            Wait-Process -Id $electronProcess.Id
        } catch {
            Write-Warning "Electron launcher process ended unexpectedly."
        }
    }
}
