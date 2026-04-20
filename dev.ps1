#!/usr/bin/env pwsh
# MyPal Developer Console
# Usage: .\dev.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ROOT     = $PSScriptRoot
$BACKEND  = Join-Path $ROOT "app\backend"
$FRONTEND = Join-Path $ROOT "app\frontend"
$LAUNCHER = Join-Path $ROOT "launcher"
$MOBILE   = Join-Path $ROOT "mobile"
$TESTS    = Join-Path $ROOT "tests"

# ──────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────
function Write-Header {
    param([string]$Title)
    $minWidth = 54
    $width    = [math]::Max($minWidth, $Title.Length + 4)
    $pad      = [math]::Max(0, [math]::Floor(($width - $Title.Length) / 2))
    $rightPad = [math]::Max(0, $width - $pad - $Title.Length)
    $line     = '═' * $width
    $left     = ' ' * $pad
    $right    = ' ' * $rightPad
    Write-Host ""
    Write-Host "╔$line╗" -ForegroundColor Cyan
    Write-Host "║$left$Title$right║" -ForegroundColor Cyan
    Write-Host "╚$line╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Menu {
    param([string]$Title, [string[]]$Items)
    Write-Header $Title
    for ($i = 0; $i -lt $Items.Count; $i++) {
        $num   = ($i + 1).ToString().PadLeft(2)
        $label = $Items[$i]
        $color = if ($label -match '^──') { 'DarkGray' } else { 'White' }
        Write-Host "  $num. $label" -ForegroundColor $color
    }
    Write-Host "   0. Back / Exit" -ForegroundColor DarkGray
    Write-Host ""
}

function Read-Choice {
    param([int]$Max)
    while ($true) {
        $raw = Read-Host "  Enter choice"
        if ($raw -match '^\d+$') {
            $n = [int]$raw
            if ($n -ge 0 -and $n -le $Max) { return $n }
        }
        Write-Host "  Invalid choice, try again." -ForegroundColor Yellow
    }
}

function Require-ADB {
    # Prefer ANDROID_HOME/platform-tools if PATH doesn't already have it
    if ($env:ANDROID_HOME -and -not (Get-Command adb -ErrorAction SilentlyContinue)) {
        $env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin"
    }
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        Write-Host "  [ERROR] adb not found." -ForegroundColor Red
        Write-Host "  Expected: $env:ANDROID_HOME\platform-tools\adb.exe" -ForegroundColor Yellow
        Write-Host "  Install Android Platform Tools or set ANDROID_HOME." -ForegroundColor Yellow
        return $false
    }
    return $true
}

function Require-Java {
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        Write-Host "  [ERROR] Java not found. Install JDK 17+ and set JAVA_HOME." -ForegroundColor Red
        return $false
    }
    return $true
}

function Ensure-NpmInstalled {
    param([string]$Dir, [string]$Label)
    if (-not (Test-Path (Join-Path $Dir "node_modules"))) {
        Write-Host "  Installing npm packages for $Label..." -ForegroundColor Yellow
        Push-Location $Dir
        npm install
        Pop-Location
    }
}

function Start-Process-NW {
    param([string]$Command, [string]$WorkDir, [string]$Title)
    Write-Host "  Starting $Title in new window..." -ForegroundColor Green
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location '$WorkDir'; $Command" -WindowStyle Normal
}

function Wait-Press {
    Write-Host ""
    Write-Host "  Press Enter to continue..." -ForegroundColor DarkGray
    $null = Read-Host
}

# ──────────────────────────────────────────────
#  Desktop sub-menu
# ──────────────────────────────────────────────
function Menu-Desktop {
    $items = @(
        'Start Backend (dev server)'
        'Start Desktop App (Electron)'
        'Start Backend + Electron together'
        'Build Desktop Installer (.exe)'
        'Run Backend Tests'
        '── Install Dependencies ──'
        'Install backend deps (npm install)'
        'Install launcher deps (npm install)'
    )
    while ($true) {
        Write-Menu 'MyPal Desktop' $items
        $c = Read-Choice -Max $items.Count
        switch ($c) {
            0 { return }
            1 {
                Ensure-NpmInstalled $BACKEND 'backend'
                Start-Process-NW 'npm start' $BACKEND 'Backend Server'
            }
            2 {
                Ensure-NpmInstalled $LAUNCHER 'launcher'
                Start-Process-NW 'npm start' $LAUNCHER 'Electron App'
            }
            3 {
                Ensure-NpmInstalled $BACKEND 'backend'
                Ensure-NpmInstalled $LAUNCHER 'launcher'
                Start-Process-NW 'npm start' $BACKEND 'Backend Server'
                Start-Sleep -Seconds 2
                Start-Process-NW 'npm start' $LAUNCHER 'Electron App'
            }
            4 {
                Ensure-NpmInstalled $LAUNCHER 'launcher'
                Write-Host "  Building desktop installer..." -ForegroundColor Cyan
                Push-Location $LAUNCHER
                npm run dist
                Pop-Location
                Write-Host "  Done! Check launcher\dist\" -ForegroundColor Green
                Wait-Press
            }
            5 {
                Ensure-NpmInstalled $BACKEND 'backend'
                Write-Host "  Running backend tests..." -ForegroundColor Cyan
                Push-Location $BACKEND
                npm test
                Pop-Location
                Wait-Press
            }
            6 {
                Write-Host "  Installing backend dependencies..." -ForegroundColor Cyan
                Push-Location $BACKEND; npm install; Pop-Location
                Write-Host "  Done." -ForegroundColor Green
                Wait-Press
            }
            7 {
                Write-Host "  Installing launcher dependencies..." -ForegroundColor Cyan
                Push-Location $LAUNCHER; npm install; Pop-Location
                Write-Host "  Done." -ForegroundColor Green
                Wait-Press
            }
        }
    }
}

# ──────────────────────────────────────────────
#  Mobile sub-menu
# ──────────────────────────────────────────────
function Menu-Mobile {
    $items = @(
        'Start Metro Bundler'
        'Run on Android (connected device/emulator)'
        'Run on iOS (macOS only)'
        '── Build ──'
        'Build APK - Debug'
        'Build APK - Release'
        'Build AAB - Release (Play Store)'
        '── Setup ──'
        'Install mobile npm deps'
        'Sync backend files to mobile'
        'Run postinstall (rn-nodeify patch)'
        '── Debug / Diagnostics ──'
        'List connected Android devices'
        'Open Logcat (Android logs)'
        'Clear Metro cache and restart'
        'Clean Android build'
    )
    while ($true) {
        Write-Menu 'MyPal Mobile' $items
        $c = Read-Choice -Max $items.Count
        switch ($c) {
            0 { return }
            1 {
                Ensure-NpmInstalled $MOBILE 'mobile'
                Start-Process-NW 'npx react-native start' $MOBILE 'Metro Bundler'
            }
            2 {
                Ensure-NpmInstalled $MOBILE 'mobile'
                if (Require-ADB) {
                    Write-Host "  Launching on Android..." -ForegroundColor Cyan
                    Push-Location $MOBILE
                    npx react-native run-android
                    Pop-Location
                    Wait-Press
                }
            }
            3 {
                if ($IsWindows) {
                    Write-Host "  iOS builds require macOS." -ForegroundColor Yellow
                } else {
                    Ensure-NpmInstalled $MOBILE 'mobile'
                    Push-Location $MOBILE
                    npx react-native run-ios
                    Pop-Location
                    Wait-Press
                }
            }
            4 { Build-APK 'debug' }
            5 { Build-APK 'release' }
            6 { Build-AAB }
            7 {
                Write-Host "  Installing mobile npm packages..." -ForegroundColor Cyan
                Push-Location $MOBILE
                npm install
                Pop-Location
                Write-Host "  Done." -ForegroundColor Green
                Wait-Press
            }
            8 {
                Write-Host "  Syncing backend files to mobile..." -ForegroundColor Cyan
                Push-Location $MOBILE
                & .\setup-backend.ps1
                Pop-Location
                Wait-Press
            }
            9 {
                Write-Host "  Running rn-nodeify patch..." -ForegroundColor Cyan
                Push-Location $MOBILE
                npx rn-nodeify --install buffer,stream,process,vm,crypto --hack
                Pop-Location
                Write-Host "  Done." -ForegroundColor Green
                Wait-Press
            }
            10 {
                if (Require-ADB) {
                    Write-Host ""
                    adb devices
                    Wait-Press
                }
            }
            11 {
                if (Require-ADB) {
                    Write-Host "  Opening Logcat in new window (Ctrl+C to stop)..." -ForegroundColor Cyan
                    Start-Process-NW 'adb logcat -s ReactNativeJS:V ReactNative:V' $MOBILE 'Logcat'
                }
            }
            12 {
                Ensure-NpmInstalled $MOBILE 'mobile'
                Start-Process-NW 'npx react-native start --reset-cache' $MOBILE 'Metro (cache cleared)'
            }
            13 { Clean-Android }
        }
    }
}

function Build-APK {
    param([string]$Variant)
    if (-not (Require-Java)) { Wait-Press; return }
    if (-not (Require-ADB))  { Wait-Press; return }

    $androidDir = Join-Path $MOBILE "android"
    if (-not (Test-Path $androidDir)) {
        Write-Host "  [ERROR] android/ directory not found inside mobile/." -ForegroundColor Red
        Wait-Press; return
    }

    # Ensure node_modules present (needed by gradle react-native plugin)
    Ensure-NpmInstalled $MOBILE 'mobile'

    Write-Host ""
    Write-Host "  Building $Variant APK..." -ForegroundColor Cyan
    Write-Host "  This may take several minutes on first run." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $androidDir
    try {
        $task = if ($Variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
        $gradlew = if ($IsWindows) { '.\gradlew.bat' } else { './gradlew' }

        # Run gradle
        & $gradlew $task --stacktrace 2>&1 | Tee-Object -Variable gradleOut

        # Find APKs
        $apkDir = Join-Path $androidDir "app\build\outputs\apk\$Variant"
        $apks   = Get-ChildItem -Path $apkDir -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue

        if ($apks) {
            Write-Host ""
            Write-Host "  Build successful! APK(s):" -ForegroundColor Green
            $apks | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
        } else {
            Write-Host "  Build may have failed - no APK found in $apkDir" -ForegroundColor Red
        }
    } catch {
        Write-Host "  Build error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    Wait-Press
}

function Build-AAB {
    if (-not (Require-Java)) { Wait-Press; return }

    $androidDir = Join-Path $MOBILE "android"
    if (-not (Test-Path $androidDir)) {
        Write-Host "  [ERROR] android/ directory not found inside mobile/." -ForegroundColor Red
        Wait-Press; return
    }

    Ensure-NpmInstalled $MOBILE 'mobile'

    Write-Host ""
    Write-Host "  Building Release AAB (Android App Bundle)..." -ForegroundColor Cyan
    Write-Host "  This may take several minutes on first run." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $androidDir
    try {
        $gradlew = if ($IsWindows) { '.\gradlew.bat' } else { './gradlew' }
        & $gradlew bundleRelease --stacktrace 2>&1 | Tee-Object -Variable gradleOut

        $aabDir = Join-Path $androidDir "app\build\outputs\bundle\release"
        $aabs   = Get-ChildItem -Path $aabDir -Filter "*.aab" -Recurse -ErrorAction SilentlyContinue

        if ($aabs) {
            Write-Host ""
            Write-Host "  Build successful! AAB(s):" -ForegroundColor Green
            $aabs | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
        } else {
            Write-Host "  Build may have failed - no AAB found in $aabDir" -ForegroundColor Red
        }
    } catch {
        Write-Host "  Build error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    Wait-Press
}

function Clean-Android {
    $androidDir = Join-Path $MOBILE "android"
    if (-not (Test-Path $androidDir)) {
        Write-Host "  [ERROR] android/ directory not found inside mobile/." -ForegroundColor Red
        Wait-Press; return
    }

    Write-Host "  Cleaning Android build..." -ForegroundColor Cyan
    Push-Location $androidDir
    try {
        $gradlew = if ($IsWindows) { '.\gradlew.bat' } else { './gradlew' }
        & $gradlew clean
        Write-Host "  Android build cleaned." -ForegroundColor Green
    } catch {
        Write-Host "  Clean error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    Wait-Press
}

# ──────────────────────────────────────────────
#  Tests sub-menu
# ──────────────────────────────────────────────
function Menu-Tests {
    $items = @(
        'Run backend unit tests'
        'Run mobile Jest tests'
        'Run E2E tests (Playwright)'
        'Run all tests'
    )
    while ($true) {
        Write-Menu 'Tests' $items
        $c = Read-Choice -Max $items.Count
        switch ($c) {
            0 { return }
            1 {
                Ensure-NpmInstalled $BACKEND 'backend'
                Write-Host "  Running backend tests..." -ForegroundColor Cyan
                Push-Location $BACKEND; npm test; Pop-Location
                Wait-Press
            }
            2 {
                Ensure-NpmInstalled $MOBILE 'mobile'
                Write-Host "  Running mobile Jest tests..." -ForegroundColor Cyan
                Push-Location $MOBILE; npm test; Pop-Location
                Wait-Press
            }
            3 {
                if (-not (Test-Path $TESTS)) {
                    Write-Host "  E2E test directory not found at: $TESTS" -ForegroundColor Yellow
                    Wait-Press; return
                }
                Ensure-NpmInstalled $TESTS 'e2e tests'
                Write-Host "  Running Playwright E2E tests..." -ForegroundColor Cyan
                Push-Location $TESTS; npx playwright test; Pop-Location
                Wait-Press
            }
            4 {
                Write-Host "  === Backend tests ===" -ForegroundColor Cyan
                Push-Location $BACKEND; npm test; Pop-Location
                Write-Host ""
                Write-Host "  === Mobile Jest tests ===" -ForegroundColor Cyan
                Push-Location $MOBILE; npm test; Pop-Location
                Wait-Press
            }
        }
    }
}

# ──────────────────────────────────────────────
#  Git sub-menu
# ──────────────────────────────────────────────
function Menu-Git {
    $items = @(
        'Show git status'
        'Show current branch'
        'Fetch latest from remote'
        'Pull latest (current branch)'
        'Show recent commits'
        'Stage all and commit'
        'Push to remote'
    )
    while ($true) {
        Write-Menu 'Git' $items
        $c = Read-Choice -Max $items.Count
        switch ($c) {
            0 { return }
            1 {
                Write-Host ""
                Push-Location $ROOT; git status; Pop-Location
                Wait-Press
            }
            2 {
                Write-Host ""
                Push-Location $ROOT; git branch --show-current; Pop-Location
                Wait-Press
            }
            3 {
                Write-Host ""
                Push-Location $ROOT; git fetch --all; Pop-Location
                Wait-Press
            }
            4 {
                Write-Host ""
                Push-Location $ROOT; git pull; Pop-Location
                Wait-Press
            }
            5 {
                Write-Host ""
                Push-Location $ROOT; git log --oneline -15; Pop-Location
                Wait-Press
            }
            6 {
                $msg = Read-Host "  Commit message"
                if ($msg) {
                    Push-Location $ROOT
                    git add -A
                    git commit -m $msg
                    Pop-Location
                    Wait-Press
                }
            }
            7 {
                Write-Host ""
                Push-Location $ROOT; git push; Pop-Location
                Wait-Press
            }
        }
    }
}

# ──────────────────────────────────────────────
#  Utilities sub-menu
# ──────────────────────────────────────────────
function Menu-Utils {
    $items = @(
        'Show Node.js version'
        'Show npm version'
        'Show React Native version'
        'Show Java version'
        'Show Android SDK / ANDROID_HOME'
        'Check ADB devices'
        'Open project in VS Code'
        'Open backend data folder'
        'Kill process on port 3001 (backend)'
        'Kill process on port 8081 (Metro)'
    )
    while ($true) {
        Write-Menu 'Utilities & Diagnostics' $items
        $c = Read-Choice -Max $items.Count
        switch ($c) {
            0 { return }
            1 { node --version; Wait-Press }
            2 { npm --version; Wait-Press }
            3 {
                Push-Location $MOBILE
                npx react-native --version 2>&1
                Pop-Location
                Wait-Press
            }
            4 {
                if (Get-Command java -ErrorAction SilentlyContinue) { java -version }
                else { Write-Host "  java not found in PATH." -ForegroundColor Yellow }
                Wait-Press
            }
            5 {
                Write-Host "  ANDROID_HOME = $env:ANDROID_HOME" -ForegroundColor White
                Write-Host "  ANDROID_SDK_ROOT = $env:ANDROID_SDK_ROOT" -ForegroundColor White
                Wait-Press
            }
            6 {
                if (Require-ADB) { adb devices }
                Wait-Press
            }
            7 { code $ROOT }
            8 { explorer.exe (Join-Path $BACKEND "data") }
            9  { Kill-Port 3001 }
            10 { Kill-Port 8081 }
        }
    }
}

function Kill-Port {
    param([int]$Port)
    $pids = netstat -ano | Select-String ":$Port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique
    if ($pids) {
        $pids | ForEach-Object {
            if ($_ -match '^\d+$') {
                Write-Host "  Killing PID $_" -ForegroundColor Yellow
                Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "  Port $Port cleared." -ForegroundColor Green
    } else {
        Write-Host "  Nothing listening on port $Port." -ForegroundColor DarkGray
    }
    Wait-Press
}

# ──────────────────────────────────────────────
#  Main menu
# ──────────────────────────────────────────────
function Main {
    while ($true) {
        $branch = & git -C $ROOT branch --show-current 2>$null
        Write-Header "MyPal Dev Console  |  $branch"
        Write-Host "  1.  Desktop (Backend + Electron)" -ForegroundColor White
        Write-Host "  2.  Mobile (React Native / Android)" -ForegroundColor White
        Write-Host "  3.  Tests" -ForegroundColor White
        Write-Host "  4.  Git" -ForegroundColor White
        Write-Host "  5.  Utilities & Diagnostics" -ForegroundColor White
        Write-Host "  0.  Exit" -ForegroundColor DarkGray
        Write-Host ""
        $c = Read-Choice -Max 5
        switch ($c) {
            0 { Write-Host "  Bye!"; return }
            1 { Menu-Desktop }
            2 { Menu-Mobile }
            3 { Menu-Tests }
            4 { Menu-Git }
            5 { Menu-Utils }
        }
    }
}

Main
