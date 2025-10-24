<#
.SYNOPSIS
    Checks if all MyPal development requirements are installed.

.DESCRIPTION
    This script validates that all necessary tools and dependencies are installed
    for MyPal desktop application development. It checks:
    - Node.js and npm
    - Rust and Cargo
    - npm packages (backend and Tauri)
    
    Optionally attempts to auto-install npm dependencies.

.PARAMETER AutoInstall
    Automatically install missing npm dependencies without prompting.

.PARAMETER Detailed
    Show detailed version information and installation paths.

.EXAMPLE
    .\check-requirements.ps1
    Check all requirements and show status.

.EXAMPLE
    .\check-requirements.ps1 -AutoInstall
    Check requirements and auto-install npm dependencies if missing.

.EXAMPLE
    .\check-requirements.ps1 -Detailed
    Check requirements with detailed version and path information.
#>

param(
    [switch]$AutoInstall,
    [switch]$Detailed
)

$ErrorActionPreference = "Stop"

function Test-Command {
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
        Path = $null
        Message = ""
        DownloadUrl = $DownloadUrl
        MeetsMinimum = $false
    }
    
    try {
        # Check if command exists
        $cmdInfo = Get-Command ($Command -split ' ')[0] -ErrorAction SilentlyContinue
        if ($cmdInfo) {
            $result.Path = $cmdInfo.Source
        }
        
        # Execute command to get version
        $output = Invoke-Expression "$Command 2>&1" | Out-String
        
        if ($LASTEXITCODE -eq 0 -or $output) {
            $result.Installed = $true
            
            # Extract version number (handles various formats)
            if ($output -match 'v?(\d+\.\d+\.\d+)') {
                $result.Version = $matches[1]
            } elseif ($output -match '(\d+\.\d+)') {
                $result.Version = "$($matches[1]).0"
            }
            
            # Check minimum version if specified
            if ($MinVersion -and $result.Version) {
                try {
                    $currentVer = [version]$result.Version
                    $minVer = [version]$MinVersion
                    
                    if ($currentVer -ge $minVer) {
                        $result.MeetsMinimum = $true
                        $result.Message = "✓ v$($result.Version)"
                    } else {
                        $result.Message = "✗ v$($result.Version) (need $MinVersion+)"
                        $result.Installed = $false
                    }
                } catch {
                    $result.Message = "✓ Installed"
                    $result.MeetsMinimum = $true
                }
            } else {
                $result.Message = "✓ Installed"
                $result.MeetsMinimum = $true
            }
        }
    } catch {
        $result.Installed = $false
        $result.Message = "✗ Not found"
    }
    
    return $result
}

function Test-NpmPackages {
    param(
        [string]$Directory,
        [string]$Name
    )
    
    $result = @{
        Name = $Name
        Installed = $false
        Path = $Directory
        Message = ""
        PackageCount = 0
    }
    
    $packageJson = Join-Path $Directory "package.json"
    $nodeModules = Join-Path $Directory "node_modules"
    
    if (-not (Test-Path $packageJson)) {
        $result.Message = "✗ package.json not found"
        return $result
    }
    
    if (Test-Path $nodeModules) {
        try {
            Push-Location $Directory
            $packages = npm list --depth=0 2>&1 | Out-String
            Pop-Location
            
            # Count installed packages
            $result.PackageCount = ([regex]::Matches($packages, "─ ")).Count
            
            if ($LASTEXITCODE -eq 0) {
                $result.Installed = $true
                $result.Message = "✓ $($result.PackageCount) packages"
            } else {
                # Some packages installed but there are issues
                $result.Installed = $false
                $result.Message = "⚠ Issues detected (run npm install)"
            }
        } catch {
            $result.Message = "⚠ Unable to verify"
        }
    } else {
        $result.Message = "✗ Not installed (run npm install)"
    }
    
    return $result
}

# Script root and directories
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "app\backend"
$tauriDir = Join-Path $scriptRoot "app\desktop\tauri-app"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MyPal Requirements Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check runtime requirements
Write-Host "Runtime Dependencies:" -ForegroundColor Yellow
Write-Host ""

$requirements = @(
    @{ Command = "node --version"; Name = "Node.js"; MinVersion = "18.0.0"; Url = "https://nodejs.org/" }
    @{ Command = "npm --version"; Name = "npm"; MinVersion = "9.0.0"; Url = "https://nodejs.org/" }
    @{ Command = "rustc --version"; Name = "Rust (rustc)"; MinVersion = "1.70.0"; Url = "https://rustup.rs/" }
    @{ Command = "cargo --version"; Name = "Cargo"; MinVersion = "1.70.0"; Url = "https://rustup.rs/" }
)

$allPassed = $true
$results = @()

foreach ($req in $requirements) {
    $result = Test-Command -Command $req.Command -Name $req.Name -MinVersion $req.MinVersion -DownloadUrl $req.Url
    $results += $result
    
    $statusColor = if ($result.Installed -and $result.MeetsMinimum) { "Green" } else { "Red" }
    
    Write-Host "  $($result.Name):" -NoNewline -ForegroundColor White
    Write-Host (" " * (20 - $result.Name.Length)) -NoNewline
    Write-Host "$($result.Message)" -ForegroundColor $statusColor
    
    if ($Detailed -and $result.Path) {
        Write-Host "    Path: $($result.Path)" -ForegroundColor DarkGray
    }
    
    if (-not ($result.Installed -and $result.MeetsMinimum)) {
        $allPassed = $false
        if ($result.DownloadUrl) {
            Write-Host "    Download: $($result.DownloadUrl)" -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""

# Check npm packages
Write-Host "npm Dependencies:" -ForegroundColor Yellow
Write-Host ""

$npmResults = @()
$npmResults += Test-NpmPackages -Directory $backendDir -Name "Backend"
$npmResults += Test-NpmPackages -Directory $tauriDir -Name "Tauri CLI"

foreach ($result in $npmResults) {
    $statusColor = if ($result.Installed) { "Green" } elseif ($result.Message -like "*⚠*") { "Yellow" } else { "Red" }
    
    Write-Host "  $($result.Name):" -NoNewline -ForegroundColor White
    Write-Host (" " * (20 - $result.Name.Length)) -NoNewline
    Write-Host "$($result.Message)" -ForegroundColor $statusColor
    
    if ($Detailed) {
        Write-Host "    Directory: $($result.Path)" -ForegroundColor DarkGray
    }
    
    if (-not $result.Installed) {
        $allPassed = $false
    }
}

Write-Host ""

# Summary and recommendations
if ($allPassed) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ All Requirements Satisfied!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You're ready to run MyPal! Launch with:" -ForegroundColor Cyan
    Write-Host "  .\AUTORUN.ps1" -ForegroundColor White
    Write-Host "  or double-click MyPal.bat" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  ⚠ Missing Requirements Detected" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Categorize missing items
    $missingRuntime = $results | Where-Object { -not ($_.Installed -and $_.MeetsMinimum) }
    $missingNpm = $npmResults | Where-Object { -not $_.Installed }
    
    if ($missingRuntime) {
        Write-Host "Missing Runtime Components:" -ForegroundColor Cyan
        foreach ($item in $missingRuntime) {
            Write-Host "  • $($item.Name)" -ForegroundColor White
            if ($item.DownloadUrl) {
                Write-Host "    → $($item.DownloadUrl)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
    
    if ($missingNpm) {
        Write-Host "Missing npm Dependencies:" -ForegroundColor Cyan
        foreach ($item in $missingNpm) {
            Write-Host "  • $($item.Name)" -ForegroundColor White
            Write-Host "    → cd $($item.Path) && npm install" -ForegroundColor Gray
        }
        Write-Host ""
        
        if ($AutoInstall) {
            Write-Host "Auto-installing npm dependencies..." -ForegroundColor Yellow
            Write-Host ""
            
            foreach ($item in $missingNpm) {
                if (Test-Path (Join-Path $item.Path "package.json")) {
                    Write-Host "Installing in $($item.Name)..." -ForegroundColor Cyan
                    Push-Location $item.Path
                    npm install
                    Pop-Location
                    Write-Host ""
                }
            }
            
            Write-Host "✓ npm dependencies installed!" -ForegroundColor Green
            Write-Host ""
        }
    }
    
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Install missing runtime components (Node.js, Rust)" -ForegroundColor White
    Write-Host "  2. Restart your terminal" -ForegroundColor White
    Write-Host "  3. Run this script again to verify: .\check-requirements.ps1" -ForegroundColor White
    
    if ($missingNpm -and -not $AutoInstall) {
        Write-Host "  4. Install npm dependencies: .\check-requirements.ps1 -AutoInstall" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "For detailed setup instructions:" -ForegroundColor Cyan
    Write-Host "  docs/development/TAURI_SETUP.md" -ForegroundColor White
    Write-Host ""
}

# Export results for scripting
if ($Detailed) {
    Write-Host "Detailed Results:" -ForegroundColor DarkGray
    Write-Host ""
    
    Write-Host "Runtime:" -ForegroundColor DarkGray
    $results | Format-Table Name, Version, Installed, MeetsMinimum, Path -AutoSize | Out-String | Write-Host -ForegroundColor DarkGray
    
    Write-Host "npm Packages:" -ForegroundColor DarkGray
    $npmResults | Format-Table Name, Installed, PackageCount, Path -AutoSize | Out-String | Write-Host -ForegroundColor DarkGray
}

# Exit code
exit $(if ($allPassed) { 0 } else { 1 })
