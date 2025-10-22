#!/usr/bin/env pwsh
# Setup script to copy backend files to mobile project

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   MyPal Mobile Backend Setup Script      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendSource = Join-Path $projectRoot "app\backend\src"
$mobileBackend = Join-Path $PSScriptRoot "nodejs-assets\nodejs-project"
$mediaSource = Join-Path $projectRoot "app\media"
$mediaDestination = Join-Path $PSScriptRoot "assets"

# Check if source backend exists
if (-not (Test-Path $backendSource)) {
    Write-Host "✗ Error: Backend source not found at $backendSource" -ForegroundColor Red
    Write-Host "  Make sure you're running this from the MOBILE directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "Source Locations:" -ForegroundColor Gray
Write-Host "  Backend: $backendSource" -ForegroundColor Gray
Write-Host "  Media:   $mediaSource" -ForegroundColor Gray
Write-Host ""
Write-Host "Destination:" -ForegroundColor Gray
Write-Host "  Backend: $mobileBackend" -ForegroundColor Gray
Write-Host "  Assets:  $mediaDestination" -ForegroundColor Gray
Write-Host ""

# Step 1: Copy backend files
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 1: Copying Backend Files" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$filesToCopy = @(
    "server.js",
    "profileManager.js",
    "NeuralNetwork.js"
)

foreach ($file in $filesToCopy) {
    $source = Join-Path $backendSource $file
    $dest = Join-Path $mobileBackend $file
    
    if (Test-Path $source) {
        Copy-Item $source $dest -Force
        $fileSize = (Get-Item $source).Length
        $fileSizeKB = [math]::Round($fileSize / 1KB, 1)
        Write-Host "  ✓ Copied $file ($fileSizeKB KB)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Warning: $file not found in source" -ForegroundColor Yellow
    }
}

Write-Host ""

# Step 2: Copy media assets (optional)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 2: Copying Media Assets (Optional)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $mediaSource) {
    Write-Host "Media folder found at: $mediaSource" -ForegroundColor Gray
    
    $copyMedia = Read-Host "Copy media assets to mobile? (y/N)"
    
    if ($copyMedia -eq 'y' -or $copyMedia -eq 'Y') {
        # Create assets directory if it doesn't exist
        if (-not (Test-Path $mediaDestination)) {
            New-Item -ItemType Directory -Path $mediaDestination -Force | Out-Null
        }
        
        # Create images subdirectory
        $imagesDestination = Join-Path $mediaDestination "images"
        if (-not (Test-Path $imagesDestination)) {
            New-Item -ItemType Directory -Path $imagesDestination -Force | Out-Null
        }
        
        # Copy image files
        $mediaImages = Join-Path $mediaSource "images"
        if (Test-Path $mediaImages) {
            $imageFiles = Get-ChildItem -Path $mediaImages -File
            foreach ($image in $imageFiles) {
                Copy-Item $image.FullName -Destination $imagesDestination -Force
                Write-Host "  ✓ Copied $($image.Name)" -ForegroundColor Green
            }
        }
        
        Write-Host ""
        Write-Host "  Media assets copied to: assets/" -ForegroundColor Green
        Write-Host "  See MEDIA_ASSETS.md for usage instructions" -ForegroundColor Yellow
    } else {
        Write-Host "  Skipped media copy" -ForegroundColor Gray
        Write-Host "  You can copy media later using MEDIA_ASSETS.md guide" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Media folder not found - skipping" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Install backend dependencies
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 3: Installing Backend Dependencies" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Push-Location $mobileBackend

Write-Host "Installing: express, body-parser, cors, ws..." -ForegroundColor Gray
npm install --save express body-parser cors ws 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Backend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Error installing dependencies" -ForegroundColor Red
    Write-Host "  Run 'npm install' manually in nodejs-assets/nodejs-project/" -ForegroundColor Yellow
}

Pop-Location

Write-Host ""

# Step 4: Verify setup
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 4: Verifying Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$requiredFiles = @(
    "nodejs-assets\nodejs-project\main.js",
    "nodejs-assets\nodejs-project\server.js",
    "nodejs-assets\nodejs-project\profileManager.js",
    "nodejs-assets\nodejs-project\NeuralNetwork.js",
    "nodejs-assets\nodejs-project\package.json"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $PSScriptRoot $file
    if (Test-Path $filePath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

# Final summary
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Setup Complete!                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($allFilesExist) {
    Write-Host "✓ All backend files are in place!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. npm install                    (install mobile dependencies)" -ForegroundColor Gray
    Write-Host "  2. npm run ios                    (or npm run android)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For detailed instructions, see:" -ForegroundColor Yellow
    Write-Host "  - README.md          (full documentation)" -ForegroundColor Gray
    Write-Host "  - SETUP_GUIDE.md     (step-by-step guide)" -ForegroundColor Gray
    Write-Host "  - MEDIA_ASSETS.md    (media usage guide)" -ForegroundColor Gray
} else {
    Write-Host "⚠ Some files are missing!" -ForegroundColor Yellow
    Write-Host "Check the errors above and ensure all backend files exist" -ForegroundColor Yellow
}

Write-Host ""
