<#
.SYNOPSIS
    Refreshes the Windows icon cache and restarts MyPal to show the updated tray icon.

.DESCRIPTION
    Windows caches system tray icons. This script clears the cache and restarts
    MyPal so the new tray icon appears correctly.
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Refreshing Tray Icon..." -ForegroundColor Cyan
Write-Host ""

# Stop any running MyPal/Electron processes
Write-Host "1. Stopping MyPal processes..." -ForegroundColor Yellow
Get-Process -Name "MyPal*","electron","node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*MyPal*" } | 
    Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

# Clear Windows icon cache
Write-Host "2. Clearing Windows icon cache..." -ForegroundColor Yellow
$iconCachePath = "$env:LOCALAPPDATA\IconCache.db"
if (Test-Path $iconCachePath) {
    Remove-Item $iconCachePath -Force -ErrorAction SilentlyContinue
    Write-Host "   Icon cache cleared" -ForegroundColor Green
}

# Also clear additional icon caches in Windows 10/11
$iconcacheFolders = @(
    "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db"
)
foreach ($pattern in $iconcacheFolders) {
    Get-Item $pattern -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}

# Restart Explorer to refresh tray
Write-Host "3. Restarting Windows Explorer..." -ForegroundColor Yellow
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Done! Icon cache cleared!" -ForegroundColor Green
Write-Host ""
Write-Host "Now starting MyPal with the new tray icon..." -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 1

# Return to root directory and run AUTORUN
$scriptRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $scriptRoot
& '.\AUTORUN.ps1'
