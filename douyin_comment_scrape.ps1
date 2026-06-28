param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Url,
    
    [Parameter(Mandatory=$false, Position=1)]
    [int]$Count = 200
)

# CRITICAL: Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot
$ScriptsSubDir = Join-Path $ScriptDir "douyin_scrape_scripts"
$DateTag = Get-Date -Format "yyyyMMdd"
$TimeTag = Get-Date -Format "HHmm"

# The JS file uses a unique placeholder: __DY_TARGET__
# PS1 replaces it with the actual number, runs, then restores

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Douyin Comment Scraper" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  URL: $Url"
Write-Host "  Target count: $Count"
Write-Host "  Date: ${DateTag}_${TimeTag}"
Write-Host ""

# Step 1
Write-Host "[1/7] Checking playwright-cli..." -ForegroundColor Green
try {
    $null = & playwright-cli --version 2>&1
    Write-Host "  OK" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: playwright-cli not found!" -ForegroundColor Red
    exit 1
}

# Step 2
Write-Host "[2/7] Checking helper script..." -ForegroundColor Green
$mainJs = Join-Path $ScriptsSubDir "scroll_and_snapshot.js"
if (-not (Test-Path $mainJs)) {
    Write-Host "  ERROR: scroll_and_snapshot.js not found" -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# Step 3 - Inject target count
Write-Host "[3/7] Injecting target count ($Count) into JS..." -ForegroundColor Green
# Read original, save backup
$jsOriginal = [System.IO.File]::ReadAllBytes($mainJs)
$jsText = [System.Text.Encoding]::UTF8.GetString($jsOriginal)
# Replace unique placeholder with actual number
$jsModified = $jsText.Replace("__DY_TARGET__", $Count.ToString())
[System.IO.File]::WriteAllBytes($mainJs, [System.Text.Encoding]::UTF8.GetBytes($jsModified))
Write-Host "  OK" -ForegroundColor Green

# Step 4 - Open browser
Write-Host "[4/7] Opening browser (--headed --persistent)..." -ForegroundColor Green
& playwright-cli open --headed --persistent | Out-Null
Start-Sleep -Seconds 5

# Step 5 - Navigate
Write-Host "[5/7] Navigating to Douyin..." -ForegroundColor Green
& playwright-cli goto $Url | Out-Null
Start-Sleep -Seconds 8

# Step 6 - Scroll and extract
Write-Host "[6/7] Scrolling and extracting (target: $Count)..." -ForegroundColor Green
$rawResult = & playwright-cli --raw run-code "--filename=$mainJs" 2>&1
$rawResult = $rawResult.Trim()

# Step 7 - Close browser
Write-Host "[7/7] Closing browser..." -ForegroundColor Green
& playwright-cli close | Out-Null

# Restore JS file to original
[System.IO.File]::WriteAllBytes($mainJs, $jsOriginal)
Write-Host "  JS file restored" -ForegroundColor Green

# Parse result
Write-Host "Parsing..." -ForegroundColor Yellow

$resultJson = $rawResult
if ($resultJson.StartsWith('"') -and $resultJson.EndsWith('"')) {
    $inner = $resultJson.Substring(1, $resultJson.Length - 2)
    try {
        $resultJson = [System.Text.RegularExpressions.Regex]::Unescape($inner)
    } catch {
        $resultJson = $inner.Replace('\"', '"').Replace('\n', "`n").Replace('\t', ' ').Replace('\\', '\')
    }
}

try {
    $parsed = $resultJson | ConvertFrom-Json
    $status = $parsed.status
    $title = $parsed.title
    $rawComments = $parsed.rawComments
    $count = $parsed.count
    $totalAvailable = $parsed.totalAvailable
    $scrollsUsed = $parsed.scrollsUsed
    Write-Host "  Status: $status"
    Write-Host "  Title: $title"
    Write-Host "  Extracted: $count / Available: $totalAvailable"
    Write-Host "  Scroll batches: $scrollsUsed"
} catch {
    Write-Host "  JSON parse failed" -ForegroundColor Red
    $status = "PARSE_ERROR"
    $title = ""
    $rawComments = @()
    $count = 0
    $totalAvailable = 0
    $scrollsUsed = 0
}

# Build output
$outputFile = Join-Path $ScriptDir "douyin_comments_${DateTag}_${TimeTag}.txt"
Write-Host "Saving to: $outputFile" -ForegroundColor Yellow

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("Douyin Video Comments")
[void]$sb.AppendLine("URL: $Url")
[void]$sb.AppendLine("Title: $title")
[void]$sb.AppendLine("Scraped: ${DateTag} ${TimeTag}")
[void]$sb.AppendLine("Target: $Count  Extracted: $count  Available: $totalAvailable  Scrolls: $scrollsUsed")
[void]$sb.AppendLine("=" * 50)
[void]$sb.AppendLine()

if ($status -eq "NO_COMMENT_LIST") {
    [void]$sb.AppendLine("[comment-list not found]")
} elseif ($status -eq "OK" -and $rawComments -and $rawComments.Count -gt 0) {
    $idx = 0
    foreach ($c in $rawComments) {
        $idx++
        [void]$sb.AppendLine("${idx}. $c")
    }
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("=" * 50)
    [void]$sb.AppendLine("Total: $count comments (target: $Count, available: $totalAvailable)")
} elseif ($status -eq "OK") {
    [void]$sb.AppendLine("[0 comments extracted]")
} else {
    [void]$sb.AppendLine("[parse error]")
}

[System.IO.File]::WriteAllText($outputFile, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Done!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Output: $outputFile" -ForegroundColor Yellow
