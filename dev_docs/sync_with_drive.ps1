<#
.SYNOPSIS
    Syncs MyPal project folder to Google Drive with availability checks.
.DESCRIPTION
    Moves contents of MyPal folder to Google Drive G: drive. Verifies drive availability
    and ensures Google Drive is running before attempting the move operation.
#>

[CmdletBinding()]
param(
    [string]$SourcePath = "C:\Users\scott\OneDrive\Desktop\Coding\AI Projects\MyPal",
    [string]$DestinationPath = "G:\My Drive\Technology\AI Projects\MyPal",
    [int]$MaxRetries = 3,
    [int]$WaitSeconds = 10
)

function Test-GoogleDriveRunning {
    $googleDriveProcesses = @("GoogleDriveFS", "GoogleDrive")
    foreach ($processName in $googleDriveProcesses) {
        if (Get-Process -Name $processName -ErrorAction SilentlyContinue) {
            return $true
        }
    }
    return $false
}

function Start-GoogleDrive {
    Write-Host "Starting Google Drive..." -ForegroundColor Yellow
    
    $googleDrivePaths = @(
        "$env:ProgramFiles\Google\Drive File Stream\GoogleDriveFS.exe",
        "$env:LOCALAPPDATA\Google\Drive\GoogleDriveFS.exe"
    )
    
    foreach ($path in $googleDrivePaths) {
        if (Test-Path $path) {
            Start-Process $path
            return $true
        }
    }
    
    Write-Error "Google Drive executable not found."
    return $false
}

function Wait-ForGoogleDrive {
    param([int]$TimeoutSeconds = 60)
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-Path "G:\") {
            Write-Host "Google Drive is now available." -ForegroundColor Green
            Start-Sleep -Seconds 5  # Additional wait for drive to stabilize
            return $true
        }
        Write-Host "Waiting for Google Drive to mount... ($elapsed/$TimeoutSeconds seconds)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        $elapsed += 5
    }
    
    return $false
}

function Sync-ToGoogleDrive {
    # Validate source path
    if (-not (Test-Path $SourcePath)) {
        Write-Error "Source path does not exist: $SourcePath"
        return $false
    }
    
    # Check if G: drive is available
    $retryCount = 0
    while ($retryCount -lt $MaxRetries) {
        if (Test-Path "G:\") {
            Write-Host "Google Drive is available." -ForegroundColor Green
            break
        }
        
        Write-Warning "Google Drive (G:) is not available. Attempt $($retryCount + 1) of $MaxRetries"
        
        # Check if Google Drive is running
        if (-not (Test-GoogleDriveRunning)) {
            Write-Host "Google Drive is not running. Starting Google Drive..." -ForegroundColor Yellow
            if (-not (Start-GoogleDrive)) {
                Write-Error "Failed to start Google Drive."
                return $false
            }
        }
        
        # Wait for drive to become available
        if (-not (Wait-ForGoogleDrive -TimeoutSeconds $WaitSeconds)) {
            $retryCount++
            if ($retryCount -lt $MaxRetries) {
                Write-Host "Retrying in $WaitSeconds seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds $WaitSeconds
            }
        } else {
            break
        }
    }
    
    # Final check
    if (-not (Test-Path "G:\")) {
        Write-Error "Google Drive is still unavailable after $MaxRetries attempts."
        return $false
    }
    
    # Ensure destination directory exists
    $destDir = Split-Path $DestinationPath -Parent
    if (-not (Test-Path $destDir)) {
        Write-Host "Creating destination directory: $destDir" -ForegroundColor Cyan
        New-Item -Path $destDir -ItemType Directory -Force | Out-Null
    }
    
    # Perform the sync
    try {
        Write-Host "Syncing files from $SourcePath to $DestinationPath..." -ForegroundColor Cyan
        
        # Using robocopy for robust file copying with progress
        $robocopyArgs = @(
            "`"$SourcePath`"",
            "`"$DestinationPath`"",
            "/MIR",           # Mirror directory tree
            "/R:3",           # Retry 3 times on failed copies
            "/W:5",           # Wait 5 seconds between retries
            "/MT:8",          # Multi-threaded (8 threads)
            "/NP",            # No progress percentage
            "/NDL",           # No directory list
            "/NFL"            # No file list
        )
        
        $result = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
        
        # Robocopy exit codes: 0-7 are success, 8+ are errors
        if ($result.ExitCode -le 7) {
            Write-Host "Sync completed successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Error "Sync failed with exit code: $($result.ExitCode)"
            return $false
        }
    }
    catch {
        Write-Error "An error occurred during sync: $_"
        return $false
    }
}

# Main execution
Write-Host "=== MyPal Google Drive Sync ===" -ForegroundColor Cyan
Write-Host "Source: $SourcePath" -ForegroundColor White
Write-Host "Destination: $DestinationPath" -ForegroundColor White
Write-Host ""

$success = Sync-ToGoogleDrive

if ($success) {
    Write-Host "`nSync operation completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSync operation failed!" -ForegroundColor Red
    exit 1
}