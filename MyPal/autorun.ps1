param(
    [switch]$SkipInstall
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

Write-Host "Starting MyPal launcher (this will also boot the backend)..."
Push-Location $launcherDir
try {
    npm run dev
} finally {
    Pop-Location
}
