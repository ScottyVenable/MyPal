param(
    [string]$IssuesDirectory = $PSScriptRoot,
    [switch]$DryRun,
    [switch]$KeepFiles,
    [string]$Assignee = "ScottyVenable",
    [int]$ProjectNumber = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-Title {
    param([string]$Content)
    $match = [regex]::Match($Content, '\*\*Title:\*\*\s*(.+)')
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }
    return $null
}

function Resolve-Labels {
    param([string]$Content)
    $match = [regex]::Match($Content, '\*\*Labels:\*\*\s*(.+)')
    if (!$match.Success) {
        return @()
    }
    return $match.Groups[1].Value.Split(",") |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) not found on PATH. Install it from https://cli.github.com/."
}

if (-not (Test-Path -LiteralPath $IssuesDirectory)) {
    throw "Issues directory '$IssuesDirectory' does not exist."
}

$issueFiles = Get-ChildItem -Path $IssuesDirectory -Filter "*.md" -File -Recurse |
    Where-Object { $_.Name -ne "ISSUE_TEMPLATE.md" }

if (-not $issueFiles) {
    Write-Host "No issue files found in '$IssuesDirectory'." -ForegroundColor Yellow
    return
}

foreach ($file in $issueFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw

    $title = Resolve-Title -Content $content
    if (-not $title) {
        Write-Warning "Skipping '$($file.Name)': could not find '**Title:**' entry."
        continue
    }

    $labels = Resolve-Labels -Content $content

    Write-Host ""
    Write-Host "Processing file: $($file.Name)" -ForegroundColor Cyan
    Write-Host "  Title : $title"
    if ($labels) {
        Write-Host "  Labels: $($labels -join ', ')"
    } else {
        Write-Host "  Labels: (none detected)"
    }

    $ghArgs = @("issue", "create", "--title", $title, "--body-file", $file.FullName)

    foreach ($label in $labels) {
        $ghArgs += @("--label", $label)
    }

    if ($Assignee) {
        $ghArgs += @("--assignee", $Assignee)
    }

    if ($DryRun) {
        $formatted = $ghArgs | ForEach-Object {
            if ($_ -match '\s') { '"{0}"' -f $_ } else { $_ }
        }
        Write-Host "DRY RUN: gh $($formatted -join ' ')" -ForegroundColor Yellow
        continue
    }

    Write-Host "  Creating GitHub issue via gh CLI..."
    try {
        $output = & gh @ghArgs
        Write-Host $output
        
        # Extract issue number from output URL (e.g., https://github.com/ScottyVenable/MyPal/issues/5)
        if ($output -match '/issues/(\d+)') {
            $issueNumber = $Matches[1]
            
            # Add issue to project board
            if ($ProjectNumber -gt 0) {
                Write-Host "  Adding issue #$issueNumber to Project #$ProjectNumber..."
                try {
                    $projectOutput = & gh project item-add $ProjectNumber --owner ScottyVenable --url "https://github.com/ScottyVenable/MyPal/issues/$issueNumber"
                    Write-Host "  Added to project board" -ForegroundColor Green
                } catch {
                    Write-Warning "  Failed to add issue to project: $_"
                }
            }
        }
        
        # Delete the file after successful creation (unless -KeepFiles flag is set)
        if (-not $KeepFiles) {
            Remove-Item -LiteralPath $file.FullName -Force
            Write-Host "  Deleted: $($file.Name)" -ForegroundColor Green
        }
    } catch {
        Write-Error "Failed to create issue for '$($file.Name)': $_"
    }
}
