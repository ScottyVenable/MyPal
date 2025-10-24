# git_manager.ps1
# Git Management Console GUI for MyPal Project

#region Helper Functions
function Show-Menu {
    param(
        [string]$Title,
        [string[]]$Options
    )
    
    Clear-Host
    Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Title" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    for ($i = 0; $i -lt $Options.Count; $i++) {
        Write-Host "  [$($i + 1)] $($Options[$i])" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "  [0] Exit" -ForegroundColor Red
    Write-Host ""
    Write-Host "Select an option: " -NoNewline -ForegroundColor Yellow
}

function Get-GitStatus {
    Write-Host "`nCurrent Git Status:" -ForegroundColor Green
    git status --short
    Write-Host "`nCurrent Branch: " -NoNewline -ForegroundColor Green
    git branch --show-current
    Write-Host ""
}

function Invoke-GitCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n$Description" -ForegroundColor Cyan
    Write-Host "   Command: $Command" -ForegroundColor DarkGray
    Write-Host ""
    
    Invoke-Expression $Command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success!" -ForegroundColor Green
    } else {
        Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
    }
    
    Read-Host "`nPress Enter to continue"
}
#endregion

#region Git Operations
function New-GitBranch {
    Write-Host "`nCreate New Branch" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Get-GitStatus
    
    Write-Host "`nBranch Naming Convention:" -ForegroundColor Yellow
    Write-Host "  - feature/description-here" -ForegroundColor White
    Write-Host "  - bugfix/issue-description" -ForegroundColor White
    Write-Host "  - patch/small-fix-description" -ForegroundColor White
    Write-Host ""
    
    $branchName = Read-Host "Enter new branch name"
    
    if ([string]::IsNullOrWhiteSpace($branchName)) {
        Write-Host "Branch name cannot be empty" -ForegroundColor Red
        Read-Host "`nPress Enter to continue"
        return
    }
    
    Write-Host "`nCreate from:" -ForegroundColor Yellow
    Write-Host "  [1] Current branch" -ForegroundColor White
    Write-Host "  [2] Specific branch" -ForegroundColor White
    $choice = Read-Host "Select option"
    
    $baseBranch = ""
    if ($choice -eq "2") {
        $baseBranch = Read-Host "Enter base branch name"
    }
    
    $command = if ($baseBranch) {
        "git checkout -b $branchName $baseBranch"
    } else {
        "git checkout -b $branchName"
    }
    
    Invoke-GitCommand -Command $command -Description "Creating branch '$branchName'"
}

function Invoke-GitCommit {
    Write-Host "`nGit Commit" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Get-GitStatus
    
    Write-Host "`nCommit Message Format: [TYPE] Brief description" -ForegroundColor Yellow
    Write-Host "Types: [BUGFIX], [FEATURE], [PATCH], [REFACTOR], [DOCS], [TEST], [TAURI], [GITHUB]" -ForegroundColor White
    Write-Host ""
    
    $commitMessage = Read-Host "Enter commit message"
    
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        Write-Host "Commit message cannot be empty" -ForegroundColor Red
        Read-Host "`nPress Enter to continue"
        return
    }
    
    Write-Host "`nFiles to commit:" -ForegroundColor Yellow
    Write-Host "  [1] All changes (git add .)" -ForegroundColor White
    Write-Host "  [2] Specific files" -ForegroundColor White
    Write-Host "  [3] Already staged files only" -ForegroundColor White
    $choice = Read-Host "Select option"
    
    switch ($choice) {
        "1" {
            Invoke-GitCommand -Command "git add ." -Description "Staging all changes"
            Invoke-GitCommand -Command "git commit -m `"$commitMessage`"" -Description "Committing changes"
        }
        "2" {
            $files = Read-Host "Enter file paths (space-separated)"
            Invoke-GitCommand -Command "git add $files" -Description "Staging specified files"
            Invoke-GitCommand -Command "git commit -m `"$commitMessage`"" -Description "Committing changes"
        }
        "3" {
            Invoke-GitCommand -Command "git commit -m `"$commitMessage`"" -Description "Committing staged changes"
        }
    }
}

function Invoke-GitPush {
    Write-Host "`nGit Push" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Get-GitStatus
    
    $currentBranch = git branch --show-current
    
    Write-Host "`nPush options:" -ForegroundColor Yellow
    Write-Host "  [1] Push to origin/$currentBranch" -ForegroundColor White
    Write-Host "  [2] Push with set-upstream (first time)" -ForegroundColor White
    Write-Host "  [3] Force push (use with caution!)" -ForegroundColor White
    $choice = Read-Host "Select option"
    
    switch ($choice) {
        "1" {
            Invoke-GitCommand -Command "git push origin $currentBranch" -Description "Pushing to origin/$currentBranch"
        }
        "2" {
            Invoke-GitCommand -Command "git push -u origin $currentBranch" -Description "Pushing and setting upstream"
        }
        "3" {
            Write-Host "`nWARNING: Force push will overwrite remote history!" -ForegroundColor Red
            $confirm = Read-Host "Type 'FORCE' to confirm"
            if ($confirm -eq "FORCE") {
                Invoke-GitCommand -Command "git push --force origin $currentBranch" -Description "Force pushing (destructive!)"
            } else {
                Write-Host "Force push cancelled" -ForegroundColor Red
                Read-Host "`nPress Enter to continue"
            }
        }
    }
}

function Invoke-GitPull {
    Write-Host "`nGit Pull" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Get-GitStatus
    
    Write-Host "`nPull options:" -ForegroundColor Yellow
    Write-Host "  [1] Pull (merge)" -ForegroundColor White
    Write-Host "  [2] Pull (rebase)" -ForegroundColor White
    Write-Host "  [3] Fetch only (no merge)" -ForegroundColor White
    $choice = Read-Host "Select option"
    
    switch ($choice) {
        "1" {
            Invoke-GitCommand -Command "git pull" -Description "Pulling with merge"
        }
        "2" {
            Invoke-GitCommand -Command "git pull --rebase" -Description "Pulling with rebase"
        }
        "3" {
            Invoke-GitCommand -Command "git fetch --all" -Description "Fetching all branches"
        }
    }
}

function Switch-GitBranch {
    Write-Host "`nSwitch Branch" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Get-GitStatus
    
    Write-Host "`nAvailable branches:" -ForegroundColor Yellow
    git branch -a
    Write-Host ""
    
    $branchName = Read-Host "Enter branch name to switch to"
    
    if ([string]::IsNullOrWhiteSpace($branchName)) {
        Write-Host "Branch name cannot be empty" -ForegroundColor Red
        Read-Host "`nPress Enter to continue"
        return
    }
    
    Invoke-GitCommand -Command "git checkout $branchName" -Description "Switching to branch '$branchName'"
}

function New-GitHubIssue {
    Write-Host "`nCreate GitHub Issue" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Write-Host "`nIssue types: [bug], [feature], [enhancement], [docs], [question]" -ForegroundColor Yellow
    Write-Host ""
    
    $issueType = Read-Host "Enter issue type"
    $issueTitle = Read-Host "Enter issue title"
    $issueDescription = Read-Host "Enter issue description"
    
    if ([string]::IsNullOrWhiteSpace($issueTitle)) {
        Write-Host "Issue title cannot be empty" -ForegroundColor Red
        Read-Host "`nPress Enter to continue"
        return
    }
    
    $fileName = "issues/[$issueType]--$($issueTitle -replace ' ','-').md"
    
    Write-Host "`nCreating issue file at: $fileName" -ForegroundColor Cyan
    Write-Host "   Please edit this file and use the GitHub CLI command inside to create the issue." -ForegroundColor Yellow
    
    $issueTemplate = @"
# Issue: $issueTitle

**Type:** $issueType
**Priority:** (Set priority)
**Labels:** (Set labels)

## Description
$issueDescription

## Acceptance Criteria
- [ ] (Add criteria)

## Technical Details
(Add implementation notes)

## GitHub CLI Command
(Add gh issue create command here)
"@

    # Create the issues directory if it doesn't exist
    $issuesDir = "issues"
    if (-not (Test-Path $issuesDir)) {
        New-Item -Path $issuesDir -ItemType Directory -Force | Out-Null
    }
    
        # Write the template to the file
        $issueTemplate | Out-File -FilePath $fileName -Encoding UTF8
        
        Write-Host "Issue file created successfully!" -ForegroundColor Green
        Read-Host "`nPress Enter to continue"
    }
    #endregion
    
    #region Main Menu
    do {
        Show-Menu -Title "Git Manager for MyPal" -Options @(
            "Create New Branch"
            "Commit Changes"
            "Push Changes"
            "Pull Changes"
            "Switch Branch"
            "Create GitHub Issue"
            "View Git Status"
        )
        
        $choice = Read-Host
        
        switch ($choice) {
            "1" { New-GitBranch }
            "2" { Invoke-GitCommit }
            "3" { Invoke-GitPush }
            "4" { Invoke-GitPull }
            "5" { Switch-GitBranch }
            "6" { New-GitHubIssue }
            "7" { Get-GitStatus; Read-Host "`nPress Enter to continue" }
            "0" { Write-Host "`nExiting..." -ForegroundColor Green; break }
            default { Write-Host "`nInvalid option" -ForegroundColor Red; Start-Sleep -Seconds 1 }
        }
    } while ($choice -ne "0")
    #endregion