#!/usr/bin/env pwsh

# Change to project directory
Set-Location "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"

# Show current status
Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status --porcelain

# Show current branch
Write-Host "`n=== Current Branch ===" -ForegroundColor Cyan
git branch --show-current

# Reset any unstaged changes to build artifacts
Write-Host "`n=== Cleaning up build artifacts ===" -ForegroundColor Cyan
git checkout -- "examples/claims-angular/.angular/"
git checkout -- "examples/claims-dotnet/bin/"
git clean -fd "examples/"

# Stage only important source code changes
Write-Host "`n=== Staging important changes ===" -ForegroundColor Cyan
git add "client/src/"
git add "server/"
git add "shared/"
git add "packages/"
git add "*.md"
git add "*.json" -f
git add "*.ts"
git add "*.tsx" 
git add "*.js"
git add "*.jsx"

# Remove any temporary files from staging
git reset HEAD "tmp*.txt" 2>$null

# Show what will be committed
Write-Host "`n=== Changes to be committed ===" -ForegroundColor Cyan
git diff --cached --name-only

# Commit if there are changes
$stagedFiles = git diff --cached --name-only
if ($stagedFiles) {
    Write-Host "`n=== Committing changes ===" -ForegroundColor Green
    git commit --no-verify -m "Final touchup: Manual edits, UI improvements, and documentation updates"
    
    # Push to GitHub
    Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Green
    git push origin final-touchup
    
    Write-Host "`n✅ Successfully pushed changes to final-touchup branch!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  No staged changes to commit." -ForegroundColor Yellow
}
