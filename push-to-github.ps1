# ============================================================
# Nirogya AI - GitHub Auto Push Script
# Uses GitHub REST API to push files WITHOUT needing git installed
# ============================================================

param(
    [string]$Token = "",
    [string]$Owner = "Himanshugupta4105",
    [string]$Repo = "nirogya-ai",
    [string]$Branch = "main"
)

# --- If token not passed as param, prompt ---
if (-not $Token) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Nirogya AI - GitHub Auto Push Script" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "A GitHub Personal Access Token is required." -ForegroundColor Yellow
    Write-Host "Get one at: https://github.com/settings/tokens" -ForegroundColor Yellow
    Write-Host "Scopes needed: [repo] (full control of private repositories)" -ForegroundColor Yellow
    Write-Host ""
    $Token = Read-Host "Paste your GitHub token here"
}

if (-not $Token -or $Token.Length -lt 10) {
    Write-Host "ERROR: No token provided. Exiting." -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $Token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$baseApi = "https://api.github.com/repos/$Owner/$Repo"

# --- Verify token works ---
Write-Host "Verifying GitHub token..." -ForegroundColor Cyan
try {
    $repoInfo = Invoke-RestMethod -Uri $baseApi -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "Connected to repo: $($repoInfo.full_name)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Cannot access repo. Check your token and repo name." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# --- Get current branch SHA ---
Write-Host "Getting current branch ref..." -ForegroundColor Cyan
try {
    $branchInfo = Invoke-RestMethod -Uri "$baseApi/git/ref/heads/$Branch" -Headers $headers -Method GET
    $latestSha = $branchInfo.object.sha
    Write-Host "Branch '$Branch' SHA: $latestSha" -ForegroundColor Green
} catch {
    Write-Host "Branch '$Branch' not found. Trying 'master'..." -ForegroundColor Yellow
    $Branch = "master"
    $branchInfo = Invoke-RestMethod -Uri "$baseApi/git/ref/heads/$Branch" -Headers $headers -Method GET
    $latestSha = $branchInfo.object.sha
    Write-Host "Branch '$Branch' SHA: $latestSha" -ForegroundColor Green
}

# --- Files to push ---
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$filesToPush = @(
    "index.html",
    ".nojekyll",
    "404.html",
    "frontend/INDEX.html",
    ".github/workflows/deploy.yml"
)

Write-Host ""
Write-Host "Pushing $($filesToPush.Count) files to GitHub..." -ForegroundColor Cyan

$successCount = 0
$errorCount = 0

foreach ($relPath in $filesToPush) {
    $fullPath = Join-Path $repoRoot $relPath
    $apiPath = $relPath -replace '\\', '/'
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  SKIP (not found): $relPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "  Pushing: $relPath" -ForegroundColor White -NoNewline
    
    # Read file content and base64 encode
    $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
    $base64Content = [Convert]::ToBase64String($fileBytes)
    
    # Check if file already exists on GitHub (to get its SHA for update)
    $existingSha = $null
    try {
        $existingFile = Invoke-RestMethod -Uri "$baseApi/contents/$apiPath" -Headers $headers -Method GET -ErrorAction SilentlyContinue
        $existingSha = $existingFile.sha
    } catch {
        # File doesn't exist yet - that's fine
    }
    
    $body = @{
        message = "fix: auto-deploy Nirogya AI production fixes [$(Get-Date -Format 'yyyy-MM-dd HH:mm')]"
        content = $base64Content
        branch = $Branch
    }
    if ($existingSha) {
        $body.sha = $existingSha
    }
    
    try {
        $result = Invoke-RestMethod -Uri "$baseApi/contents/$apiPath" -Headers $headers -Method PUT -Body ($body | ConvertTo-Json -Depth 5) -ContentType "application/json" -ErrorAction Stop
        Write-Host " ✓" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host " ✗ ERROR" -ForegroundColor Red
        Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DONE! $successCount files pushed, $errorCount errors" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "Next step - Enable GitHub Pages:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://github.com/$Owner/$Repo/settings/pages" -ForegroundColor White
    Write-Host "  2. Under 'Source': select 'GitHub Actions'" -ForegroundColor White
    Write-Host "  3. Wait ~2 min for deployment" -ForegroundColor White
    Write-Host "  4. Your site: https://$Owner.github.io/$Repo/" -ForegroundColor Green
    Write-Host ""
    
    # Open settings page automatically
    Write-Host "Opening GitHub Pages settings in browser..." -ForegroundColor Cyan
    Start-Process "https://github.com/$Owner/$Repo/settings/pages"
    Start-Sleep -Seconds 1
    Start-Process "https://github.com/$Owner/$Repo/actions"
}
