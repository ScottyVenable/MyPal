<#
.SYNOPSIS
    Launches MyPal with the Tauri desktop shell in development mode.

.DESCRIPTION
    This script ensures all npm dependencies are installed and starts MyPal
    using the Tauri desktop shell. It automatically sets up data directories
    and environment variables for development. Logs are organized into
    date-based subdirectories for easier navigation and debugging.

.PARAMETER SkipInstall
    Skip checking and installing npm dependencies. Useful for faster restarts
    when you know dependencies are already installed.

.PARAMETER NoServerConsole
    Prevent the server console window from auto-opening. The console can still
    be opened manually via the system tray menu.

.PARAMETER LogTimeFormat
    Set the time format for log directory naming. Options:
    - '12hour' (default): hh-mm-ss_AM/PM format (e.g., 02-30-45_PM)
    - '24hour': HH-mm-ss format (e.g., 14-30-45)
    - 'timestamp': HHmmss format (e.g., 143045)
    - 'custom': Use CustomLogFormat parameter for custom format

.PARAMETER CustomLogFormat
    Custom PowerShell date/time format string when LogTimeFormat is 'custom'.
    Example: 'HHmmss-fff' for millisecond precision

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
    .\autorun.ps1 -LogTimeFormat 24hour
    Launch with 24-hour time format for log directories.

.EXAMPLE
    .\autorun.ps1 -LogTimeFormat custom -CustomLogFormat 'HHmmss-fff'
    Launch with custom millisecond-precision time format.

.EXAMPLE
    .\autorun.ps1 -SkipInstall -NoServerConsole
    Quick launch with no console window.
#>

param(
    [switch]$SkipInstall,
    [switch]$NoServerConsole,
    [ValidateSet('12hour', '24hour', 'timestamp', 'custom')]
    [string]$LogTimeFormat = '12hour',
    [string]$CustomLogFormat = ''
)

$ErrorActionPreference = "Stop"

# Log directory time format configurations
$LogTimeFormats = @{
    '12hour'    = 'hh-mm-ss_tt'           # 02-30-45_PM
    '24hour'    = 'HH-mm-ss'              # 14-30-45
    'timestamp' = 'HHmmss'                # 143045
    'custom'    = $CustomLogFormat        # User-defined
}

function Remove-EmptyLogDirectories {
    param(
        [string]$RootPath
    )
    
    if (-not (Test-Path $RootPath)) {
        return
    }
    
    Write-Host "Cleaning empty log directories in: $RootPath" -ForegroundColor DarkGray
    
    $removed = 0
    # Get all directories recursively, deepest first
    Get-ChildItem -Path $RootPath -Directory -Recurse -Force | 
        Sort-Object { $_.FullName.Length } -Descending | 
        ForEach-Object {
            # Check if directory is empty (no files and no subdirectories)
            $hasFiles = (Get-ChildItem -Path $_.FullName -File -Force -ErrorAction SilentlyContinue).Count -gt 0
            $hasSubDirs = (Get-ChildItem -Path $_.FullName -Directory -Force -ErrorAction SilentlyContinue).Count -gt 0
            
            if (-not $hasFiles -and -not $hasSubDirs) {
                try {
                    Remove-Item -Path $_.FullName -Force -ErrorAction Stop
                    $removed++
                    Write-Host "  Removed empty: $($_.FullName)" -ForegroundColor DarkGray
                } catch {
                    Write-Host "  Failed to remove: $($_.FullName) - $($_.Exception.Message)" -ForegroundColor DarkYellow
                }
            }
        }
    
    if ($removed -gt 0) {
        Write-Host "Cleaned $removed empty log director$(if($removed -eq 1){'y'}else{'ies'})" -ForegroundColor Green
    } else {
        Write-Host "No empty log directories found" -ForegroundColor DarkGray
    }
}

function Start-LogConsole {
    param(
        [string]$LogFile,
        [string]$WorkingDirectory
    )

    if (-not (Test-Path $LogFile)) {
        New-Item -ItemType File -Path $LogFile -Force | Out-Null
    }

    $commandScript = @"
& {
    param([string]`$logPath, [string]`$rootDir)
    try { Set-Location `$rootDir } catch {}
    Clear-Host
    if (`$Host.Name -eq 'ConsoleHost') {
        try { `$host.UI.RawUI.WindowTitle = "MyPal Live Log" } catch {}
    }
    Write-Host '=== MyPal Live Log ===' -ForegroundColor Cyan
    Write-Host -ForegroundColor DarkGray "Watching: `$logPath"
    Write-Host -ForegroundColor DarkGray 'Press Ctrl+C to close this window.'
    Write-Host ''
    Get-Content -Path `$logPath -Wait -Tail 200
} -logPath '$LogFile' -rootDir '$WorkingDirectory'
"@

    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoExit", "-Command", $commandScript | Out-Null
}

function Initialize-NpmDependencies {
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

function Get-NpmExecutable {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -eq $npm) {
        throw "npm executable not found in PATH. Please install Node.js and ensure npm is available."
    }
    return $npm.Source
}

function Test-Requirement {
    param(
        [string]$Command,
        [string]$Name,
        [string]$MinVersion = $null,
        [string]$DownloadUrl = $null
    )
    
    $result = @{
        Name = $Name
        Installed = $false
        Version = $null
        Message = ""
        DownloadUrl = $DownloadUrl
    }
    
    try {
        $output = & $Command 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -or $output) {
            $result.Installed = $true
            
            # Extract version number
            if ($output -match 'v?(\d+\.\d+\.\d+)') {
                $result.Version = $matches[1]
            }
            
            # Check minimum version if specified
            if ($MinVersion -and $result.Version) {
                $currentVer = [version]$result.Version
                $minVer = [version]$MinVersion
                
                if ($currentVer -lt $minVer) {
                    $result.Message = "Version $($result.Version) found, but $MinVersion+ required"
                    $result.Installed = $false
                } else {
                    $result.Message = "Version $($result.Version) [OK]"
                }
            } else {
                $result.Message = "Installed"
            }
        }
    } catch {
        $result.Installed = $false
        $result.Message = "Not found"
    }
    
    return $result
}

function Test-AllRequirements {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Checking System Requirements" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $requirements = @(
        @{ Command = "node --version"; Name = "Node.js"; MinVersion = "18.0.0"; Url = "https://nodejs.org/" }
        @{ Command = "npm --version"; Name = "npm"; MinVersion = "9.0.0"; Url = "https://nodejs.org/" }
        @{ Command = "rustc --version"; Name = "Rust"; MinVersion = "1.70.0"; Url = "https://rustup.rs/" }
        @{ Command = "cargo --version"; Name = "Cargo"; MinVersion = "1.70.0"; Url = "https://rustup.rs/" }
    )
    
    $allPassed = $true
    $results = @()
    
    foreach ($req in $requirements) {
        $result = Test-Requirement -Command $req.Command -Name $req.Name -MinVersion $req.MinVersion -DownloadUrl $req.Url
        $results += $result
        
        $statusIcon = if ($result.Installed) { "[SUCCESS]" } else { "[FAILED]" }
        $statusColor = if ($result.Installed) { "Green" } else { "Red" }
        
        Write-Host "  [$statusIcon] " -NoNewline -ForegroundColor $statusColor
        Write-Host "$($result.Name): " -NoNewline -ForegroundColor White
        Write-Host "$($result.Message)" -ForegroundColor Gray
        
        if (-not $result.Installed) {
            $allPassed = $false
            if ($result.DownloadUrl) {
                Write-Host "      Download: $($result.DownloadUrl)" -ForegroundColor DarkYellow
            }
        }
    }
    
    Write-Host ""
    
    if (-not $allPassed) {
        Write-Host "!! Missing Requirements Detected !!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Some required tools are not installed or need updating." -ForegroundColor Yellow
        Write-Host "Please install the missing components before running MyPal." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Quick Setup Guide:" -ForegroundColor Cyan
        
        $rustMissing = $results | Where-Object { $_.Name -in @("Rust", "Cargo") -and -not $_.Installed }
        if ($rustMissing) {
            Write-Host "  1. Install Rust: https://rustup.rs/" -ForegroundColor White
            Write-Host "     - Run the installer and follow prompts" -ForegroundColor DarkGray
            Write-Host "     - Restart terminal after installation" -ForegroundColor DarkGray
        }
        
        $nodeMissing = $results | Where-Object { $_.Name -in @("Node.js", "npm") -and -not $_.Installed }
        if ($nodeMissing) {
            Write-Host "  2. Install Node.js: https://nodejs.org/" -ForegroundColor White
            Write-Host "     - Download LTS version (20.x recommended)" -ForegroundColor DarkGray
            Write-Host "     - Restart terminal after installation" -ForegroundColor DarkGray
        }
        
        Write-Host ""
        Write-Host "For detailed setup instructions, see:" -ForegroundColor Cyan
        Write-Host "  docs/development/TAURI_SETUP.md" -ForegroundColor White
        Write-Host ""
        
        $continueAnyway = Read-Host "Continue anyway? [y/N]"
        if ($continueAnyway -ne "y" -and $continueAnyway -ne "Y") {
            Write-Host "Exiting. Please install missing requirements and try again." -ForegroundColor Yellow
            exit 1
        }
        Write-Host ""
    } else {
        Write-Host "[OK] All requirements satisfied!" -ForegroundColor Green
        Write-Host ""
    }
    
    return $allPassed
}

function Start-BackendServer {
    param(
        [string]$Directory
    )

    Write-Host "Starting MyPal backend..." -ForegroundColor Yellow
    $backendProcess = Start-Process -FilePath "npm" -ArgumentList @("run", "dev") -WorkingDirectory $Directory -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 1
    return $backendProcess
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "app\backend"
$tauriDir = Join-Path $scriptRoot "app\desktop\tauri-app"

# Check system requirements
Test-AllRequirements | Out-Null

Initialize-NpmDependencies -Directory $backendDir
Initialize-NpmDependencies -Directory $tauriDir

# Set up data directories
$env:MYPAL_DATA_DIR = Join-Path $scriptRoot "dev-data"
$baseLogsDir = Join-Path $scriptRoot "dev-logs"
$env:MYPAL_MODELS_DIR = Join-Path $scriptRoot "app\backend\models"
$env:MYPAL_FORCE_TELEMETRY = '1'

# Create timestamped log directory: dev-logs/YYYY-MM-DD/HH-MM-SS_AM-PM/
$dateFolder = Get-Date -Format "yyyy-MM-dd"
$timeFormat = $LogTimeFormats[$LogTimeFormat]
if ([string]::IsNullOrWhiteSpace($timeFormat) -and $LogTimeFormat -eq 'custom') {
    Write-Warning "Custom log format not provided. Falling back to 12hour format."
    $timeFormat = $LogTimeFormats['12hour']
}
$timeFolder = Get-Date -Format $timeFormat
$sessionLogsDir = Join-Path $baseLogsDir (Join-Path $dateFolder $timeFolder)
$env:MYPAL_LOGS_DIR = $sessionLogsDir

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

# Clean up empty log directories
Write-Host ""
Remove-EmptyLogDirectories -RootPath $baseLogsDir
Write-Host ""

Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Starting MyPal with Tauri Desktop    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  - Server Console: Auto-opens to show real-time logs" -ForegroundColor White
Write-Host "  - Tauri Shell: Lightweight WebView with native menus" -ForegroundColor White
Write-Host "  - Background Mode: Keep server running when window closes" -ForegroundColor White
Write-Host ""
Write-Host "Data Directory: $env:MYPAL_DATA_DIR" -ForegroundColor Gray
Write-Host "Logs Directory: $env:MYPAL_LOGS_DIR" -ForegroundColor Gray
Write-Host "Log Format: $LogTimeFormat" -ForegroundColor Gray
Write-Host ""
Write-Host "Tip: Run '.\autorun.ps1 -NoServerConsole' to skip the console window" -ForegroundColor DarkGray
Write-Host "Tip: Run '.\autorun.ps1 -SkipInstall' for faster restarts" -ForegroundColor DarkGray
Write-Host "Tip: Run '.\autorun.ps1 -LogTimeFormat 24hour' for 24-hour log naming" -ForegroundColor DarkGray
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
        $baseLogsDir = Join-Path $scriptRoot "logs"
        $dateFolder = Get-Date -Format "yyyy-MM-dd"
        $timeFormat = $LogTimeFormats[$LogTimeFormat]
        $timeFolder = Get-Date -Format $timeFormat
        $sessionLogsDir = Join-Path $baseLogsDir (Join-Path $dateFolder $timeFolder)
        $env:MYPAL_LOGS_DIR = $sessionLogsDir
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
            Push-Location $tauriDir
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
Write-Host "Starting services..." -ForegroundColor Cyan
$backendProcess = $null
try {
    $backendProcess = Start-BackendServer -Directory $backendDir
} catch {
    Write-Error "Failed to start backend: $_"
    exit 1
}

if ($shouldOpenLogConsole) {
    Start-Sleep -Milliseconds 500
    Write-Host "Opening live log console window..." -ForegroundColor Cyan
    Start-LogConsole -LogFile $consoleLogFile -WorkingDirectory $scriptRoot
}

Write-Host ""
Write-Host "Launching MyPal Tauri desktop (Press Ctrl+C to stop)..." -ForegroundColor Yellow
Write-Host ""

Push-Location $tauriDir
try {
    npm run dev
} finally {
    Pop-Location
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "Stopping backend..." -ForegroundColor DarkGray
        try {
            Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Verbose "Backend process already stopped."
        }
    }
}
