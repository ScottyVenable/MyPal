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
    .\autorun.ps1 -LogTimeFormat 24hour
    Launch with 24-hour time format for log directories.

.EXAMPLE
    .\autorun.ps1 -LogTimeFormat custom -CustomLogFormat 'HHmmss-fff'
    Launch with custom millisecond-precision time format.

#>

param(
    [switch]$SkipInstall,
    [ValidateSet('12hour', '24hour', 'timestamp', 'custom')]
    [string]$LogTimeFormat = '12hour',
    [string]$CustomLogFormat = '',
    [switch]$CheckRequirementsOnly
)

$ErrorActionPreference = "Stop"

# Refresh PATH from system environment variables to include newly installed tools
Write-Host "Refreshing environment variables..." -ForegroundColor DarkGray
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($machinePath -and $userPath) {
    $env:Path = "$machinePath;$userPath"
}

# Ensure common developer tool paths are available in this session
function Add-PathIfExists {
    param([string[]]$Paths)
    
    if (-not $Paths) { return }
    
    $currentPaths = $env:PATH -split ';'
    
    foreach ($path in $Paths) {
        if ([string]::IsNullOrWhiteSpace($path)) { continue }
        
        $expandedPath = [Environment]::ExpandEnvironmentVariables($path)
        if (Test-Path $expandedPath) {
            $alreadyPresent = $currentPaths | Where-Object { $_.TrimEnd('\') -ieq $expandedPath.TrimEnd('\') }
            if (-not $alreadyPresent) {
                $env:PATH = "$expandedPath;$env:PATH"
                $currentPaths += $expandedPath
            }
        }
    }
}

# Rust installer typically drops tools in %USERPROFILE%\.cargo\bin
# Node.js is typically in Program Files\nodejs
Add-PathIfExists -Paths @(
    "$env:USERPROFILE\.cargo\bin",
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs"
)

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
        $commandToRun = $Command
        if ($Command -is [string]) {
            $commandToRun = [ScriptBlock]::Create($Command)
        }

        $output = & $commandToRun 2>&1 | Out-String
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

    Write-Host "Starting MyPal backend in separate window..." -ForegroundColor Yellow
    
    # Start backend in a new PowerShell window that stays open
    # Use -NoExit to keep window open even if npm crashes
    $backendProcess = Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoExit", "-Command", "cd '$Directory'; Write-Host 'Starting MyPal Backend Server...' -ForegroundColor Cyan; npm run dev") `
        -PassThru
    
    Write-Host "Backend window opened (PID: $($backendProcess.Id))" -ForegroundColor Gray
    
    # Wait for process to initialize
    Start-Sleep -Seconds 3
    
    # Check if the process is still running
    if ($backendProcess.HasExited) {
        Write-Error "Backend process exited immediately. Check the backend window for errors."
        throw "Backend failed to start"
    }
    
    # Give the server more time to bind to the port and initialize
    Start-Sleep -Seconds 3
    
    # Test if the backend is responding
    $maxAttempts = 5
    $attempt = 0
    $success = $false
    
    while ($attempt -lt $maxAttempts -and -not $success) {
        $attempt++
        Write-Host "Checking backend health (attempt $attempt/$maxAttempts)..." -ForegroundColor Gray
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            Write-Host "Backend started successfully on http://localhost:3001" -ForegroundColor Green
            $success = $true
        } catch {
            if ($attempt -lt $maxAttempts) {
                Write-Host "Backend not responding yet, waiting..." -ForegroundColor DarkGray
                Start-Sleep -Seconds 2
            } else {
                Write-Warning "Backend process started but not responding to health checks. Check the backend window for errors."
            }
        }
    }
    
    return $backendProcess
}

function Set-DevelopmentMode {
    $env:MYPAL_DATA_DIR = Join-Path $scriptRoot "dev-data"
    $script:BaseLogsDir = Join-Path $scriptRoot "dev-logs"
    $env:MYPAL_MODELS_DIR = Join-Path $scriptRoot "app\backend\models"
    $env:MYPAL_FORCE_TELEMETRY = '1'
    Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
    $script:CurrentModeName = 'Development'
}

function Set-ProductionMode {
    $env:MYPAL_DATA_DIR = Join-Path $scriptRoot "data"
    $script:BaseLogsDir = Join-Path $scriptRoot "logs"
    $env:MYPAL_MODELS_DIR = Join-Path $scriptRoot "app\backend\models"
    $env:MYPAL_FORCE_TELEMETRY = '0'
    $env:NODE_ENV = 'production'
    $script:CurrentModeName = 'Production'
}

function Configure-CustomMode {
    Write-Host "`nCustom Mode - Configure Options" -ForegroundColor Yellow
    Write-Host ""

    $script:CurrentModeName = 'Custom'

    Write-Host "Current data directory: $($env:MYPAL_DATA_DIR)" -ForegroundColor Gray
    $customData = Read-Host "Enter custom data directory (press Enter to keep current)"
    if (-not [string]::IsNullOrWhiteSpace($customData)) {
        $env:MYPAL_DATA_DIR = $customData
    }

    Write-Host "Current logs directory: $($script:BaseLogsDir)" -ForegroundColor Gray
    $customLogs = Read-Host "Enter custom logs directory (press Enter to keep current)"
    if (-not [string]::IsNullOrWhiteSpace($customLogs)) {
        $script:BaseLogsDir = $customLogs
    }

    $currentPort = if ([string]::IsNullOrWhiteSpace($env:PORT)) { '3001 (default)' } else { $env:PORT }
    Write-Host "Current port: $currentPort" -ForegroundColor Gray
    $customPort = Read-Host "Enter custom port (press Enter for default)"
    if (-not [string]::IsNullOrWhiteSpace($customPort)) {
        $env:PORT = $customPort
    }

    Write-Host "Enable telemetry? [Y/n]" -ForegroundColor Gray
    $telemetryChoice = Read-Host
    if ($telemetryChoice -eq 'n' -or $telemetryChoice -eq 'N') {
        $env:MYPAL_FORCE_TELEMETRY = '0'
    } else {
        $env:MYPAL_FORCE_TELEMETRY = '1'
    }

    $currentNodeEnv = if ($env:NODE_ENV) { $env:NODE_ENV } else { '(not set)' }
    Write-Host "Current NODE_ENV: $currentNodeEnv" -ForegroundColor Gray
    $customNodeEnv = Read-Host "Enter custom NODE_ENV (press Enter to keep current)"
    if (-not [string]::IsNullOrWhiteSpace($customNodeEnv)) {
        $env:NODE_ENV = $customNodeEnv
    }

    if (-not $env:MYPAL_MODELS_DIR) {
        $env:MYPAL_MODELS_DIR = Join-Path $scriptRoot "app\backend\models"
    }

    Write-Host "`nCustom configuration applied" -ForegroundColor Green
}

function Show-ModeSelection {
    while ($true) {
        Write-Host ""
        Write-Host "Select launch mode:" -ForegroundColor Cyan
        Write-Host "  [1] Development (dev-data, dev-logs)" -ForegroundColor White
        Write-Host "  [2] Production (data, logs)" -ForegroundColor White
        Write-Host "  [3] Custom" -ForegroundColor White
        Write-Host ""
        $modeChoice = Read-Host "Enter choice [1-3] (press Enter for default)"

        if ([string]::IsNullOrWhiteSpace($modeChoice)) {
            $modeChoice = '1'
        }

        switch ($modeChoice) {
            '2' {
                Set-ProductionMode
                Write-Host "`nProduction Mode Selected" -ForegroundColor Green
                return
            }
            '3' {
                Configure-CustomMode
                return
            }
            '1' {
                Set-DevelopmentMode
                Write-Host "`nDevelopment Mode Selected" -ForegroundColor Green
                return
            }
            default {
                Write-Host "Invalid choice. Please try again." -ForegroundColor Yellow
            }
        }
    }
}

function Initialize-SessionDirectories {
    if (-not [string]::IsNullOrWhiteSpace($script:BaseLogsDir)) {
        Remove-EmptyLogDirectories -RootPath $script:BaseLogsDir
    }

    $dateFolder = Get-Date -Format "yyyy-MM-dd"
    $timeFormat = $LogTimeFormats[$LogTimeFormat]
    if ([string]::IsNullOrWhiteSpace($timeFormat) -and $LogTimeFormat -eq 'custom') {
        Write-Warning "Custom log format not provided. Falling back to 12hour format."
        $timeFormat = $LogTimeFormats['12hour']
    }
    $timeFolder = Get-Date -Format $timeFormat

    $sessionLogsDir = if ($script:BaseLogsDir) {
        Join-Path $script:BaseLogsDir (Join-Path $dateFolder $timeFolder)
    } else {
        Join-Path $scriptRoot (Join-Path 'logs' (Join-Path $dateFolder $timeFolder))
    }

    $env:MYPAL_LOGS_DIR = $sessionLogsDir

    foreach ($dir in @($env:MYPAL_DATA_DIR, $env:MYPAL_LOGS_DIR, $env:MYPAL_MODELS_DIR)) {
        if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path $dir)) {
            Write-Host "Creating directory: $dir"
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    $script:SessionLogsDir = $sessionLogsDir
}

function Show-SettingsMenu {
    while ($true) {
        Write-Host ""
        Write-Host "=============== Settings Menu ===============" -ForegroundColor Yellow
        Write-Host "Current data directory: $($env:MYPAL_DATA_DIR)" -ForegroundColor Gray
        $displayLogsDir = if ([string]::IsNullOrWhiteSpace($env:MYPAL_LOGS_DIR)) { $script:BaseLogsDir } else { $env:MYPAL_LOGS_DIR }
        Write-Host "Current logs directory: $displayLogsDir" -ForegroundColor Gray
        Write-Host "  [1] Clear data directory" -ForegroundColor White
        Write-Host "  [2] Clear logs directory" -ForegroundColor White
        Write-Host "  [3] Rebuild npm dependencies" -ForegroundColor White
        Write-Host "  [4] Run backend tests" -ForegroundColor White
        Write-Host "  [5] Return to main menu" -ForegroundColor White
        Write-Host ""
        $settingsChoice = Read-Host "Enter choice [1-5]"

        switch ($settingsChoice) {
            '1' {
                Write-Host "Clearing data directory..." -ForegroundColor Yellow
                if (Test-Path $env:MYPAL_DATA_DIR) {
                    Remove-Item -Path "$($env:MYPAL_DATA_DIR)\*" -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "Data directory cleared" -ForegroundColor Green
                } else {
                    Write-Host "Data directory not found." -ForegroundColor DarkYellow
                }
            }
            '2' {
                $logsTarget = if (Test-Path $env:MYPAL_LOGS_DIR) { $env:MYPAL_LOGS_DIR } elseif (Test-Path $script:BaseLogsDir) { $script:BaseLogsDir } else { $null }
                if ($logsTarget) {
                    Write-Host "Clearing logs directory ($logsTarget)..." -ForegroundColor Yellow
                    Remove-Item -Path "$logsTarget\*" -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "Logs directory cleared" -ForegroundColor Green
                } else {
                    Write-Host "Logs directory not found." -ForegroundColor DarkYellow
                }
            }
            '3' {
                Write-Host "Rebuilding npm dependencies..." -ForegroundColor Yellow
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
            '4' {
                Write-Host "Running backend tests..." -ForegroundColor Yellow
                Push-Location $backendDir
                try {
                    npm test
                } finally {
                    Pop-Location
                }
            }
            '5' {
                return
            }
            default {
                Write-Host "Invalid choice. Please try again." -ForegroundColor Yellow
            }
        }
    }
}

function Launch-MyPal {
    Show-ModeSelection
    Initialize-SessionDirectories

    Write-Host ""
    $openSettings = Read-Host "Open Settings before launch? [y/N]"
    if ($openSettings -eq 'y' -or $openSettings -eq 'Y') {
        Show-SettingsMenu
        Initialize-SessionDirectories
    }

    Write-Host ""
    Write-Host "Final configuration:" -ForegroundColor Cyan
    Write-Host "  Mode: $script:CurrentModeName" -ForegroundColor White
    Write-Host "  Data: $($env:MYPAL_DATA_DIR)" -ForegroundColor White
    Write-Host "  Logs: $($env:MYPAL_LOGS_DIR)" -ForegroundColor White
    if ($env:PORT) {
        Write-Host "  Port: $($env:PORT)" -ForegroundColor White
    }
    if ($env:NODE_ENV) {
        Write-Host "  NODE_ENV: $($env:NODE_ENV)" -ForegroundColor White
    }
    Write-Host "  Telemetry: $($env:MYPAL_FORCE_TELEMETRY)" -ForegroundColor White
    $consoleLogFile = Join-Path $env:MYPAL_LOGS_DIR "console.log"
    Write-Host "  Console log file: $consoleLogFile" -ForegroundColor White

    Write-Host ""
    Write-Host "Starting services..." -ForegroundColor Cyan
    $backendProcess = $null
    try {
        $backendProcess = Start-BackendServer -Directory $backendDir
    } catch {
        Write-Error "Failed to start backend: $_"
        return
    }

    Write-Host ""
    Write-Host "Launching MyPal Tauri desktop (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "Backend is running in a separate window - close it manually or it will stop when Tauri exits" -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $tauriDir
    try {
        npm run dev
    } finally {
        Pop-Location
        if ($backendProcess -and -not $backendProcess.HasExited) {
            Write-Host ""
            Write-Host "Stopping backend server..." -ForegroundColor Yellow
            try {
                $childProcesses = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $backendProcess.Id }
                foreach ($child in $childProcesses) {
                    Write-Host "  Stopping child process: $($child.Name) (PID: $($child.ProcessId))" -ForegroundColor DarkGray
                    Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
                }

                Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
                Write-Host "Backend stopped" -ForegroundColor Green
            } catch {
                Write-Verbose "Backend process already stopped or could not be terminated: $_"
            }
        } else {
            Write-Host ""
            Write-Host "Backend process has already exited" -ForegroundColor DarkGray
        }
    }

    Write-Host ""
    Write-Host "MyPal session ended. Returning to main menu..." -ForegroundColor Cyan
}

function Show-MainMenu {
    while ($true) {
        Write-Host ""
        Write-Host "==================== Main Menu ====================" -ForegroundColor Cyan
        Write-Host "  [1] Start MyPal" -ForegroundColor White
        Write-Host "  [2] Settings" -ForegroundColor White
        Write-Host "  [3] Check Requirements" -ForegroundColor White
        Write-Host "  [4] Exit" -ForegroundColor White
        Write-Host ""
        $menuChoice = Read-Host "Enter choice [1-4]"

        switch ($menuChoice) {
            '1' {
                Launch-MyPal
            }
            '2' {
                Show-SettingsMenu
            }
            '3' {
                Test-AllRequirements | Out-Null
            }
            '4' {
                Write-Host "Exiting MyPal launcher. Goodbye!" -ForegroundColor Cyan
                return
            }
            default {
                Write-Host "Invalid choice. Please try again." -ForegroundColor Yellow
            }
        }
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "app\backend"
$tauriDir = Join-Path $scriptRoot "app\desktop\tauri-app"

# Check system requirements
Test-AllRequirements | Out-Null

if ($CheckRequirementsOnly) {
    Write-Host "Requirement check completed (CheckRequirementsOnly flag supplied)." -ForegroundColor Cyan
    return
}

Initialize-NpmDependencies -Directory $backendDir
Initialize-NpmDependencies -Directory $tauriDir

Set-DevelopmentMode
$script:SessionLogsDir = $null
$env:MYPAL_LOGS_DIR = $script:BaseLogsDir

if ($script:BaseLogsDir) {
    Remove-EmptyLogDirectories -RootPath $script:BaseLogsDir
}

Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    MyPal Desktop Launcher (Tauri)       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  - Unified backend + Tauri startup" -ForegroundColor White
Write-Host "  - Timestamped log directories per session" -ForegroundColor White
Write-Host "  - Integrated main menu with settings" -ForegroundColor White
Write-Host ""
Write-Host "Default Data Directory: $($env:MYPAL_DATA_DIR)" -ForegroundColor Gray
Write-Host "Default Logs Directory: $script:BaseLogsDir" -ForegroundColor Gray
Write-Host "Log Format: $LogTimeFormat" -ForegroundColor Gray
Write-Host ""
Write-Host "Tip: Run '.\autorun.ps1 -SkipInstall' for faster restarts" -ForegroundColor DarkGray
Write-Host "Tip: Run '.\autorun.ps1 -LogTimeFormat 24hour' for 24-hour log naming" -ForegroundColor DarkGray
Write-Host ""

Show-MainMenu
