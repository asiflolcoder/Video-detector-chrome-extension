# Runs every verification page in headless Chromium and prints a summary table.
# Usage: powershell -ExecutionPolicy Bypass -File tools\run-all.ps1
# Exits non-zero when any page fails.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$chromeCandidates = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Chromium\Application\chrome.exe"
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Error "No Chromium-based browser found."; exit 2 }

$pages = @(
  @{ Name = "task2 (discovery)";  File = "test\task2\verify.html";         Attr = "data-task2-result" },
  @{ Name = "task3 (metadata)";   File = "test\task3\verify.html";         Attr = "data-task3-result" },
  @{ Name = "task4 (visibility)"; File = "test\task4\verify.html";         Attr = "data-task4-result" },
  @{ Name = "task5 (playback)";   File = "test\task5\verify.html";         Attr = "data-task5-result" },
  @{ Name = "task6 (scoring)";    File = "test\task6\verify.html";         Attr = "data-task6-result" },
  @{ Name = "task7 (selection)";  File = "test\task7\verify.html";         Attr = "data-task7-result" },
  @{ Name = "stress (product)";   File = "test\product\verify.html";       Attr = "data-stress-result" },
  @{ Name = "e2e (pipeline)";     File = "test\product\smoke-e2e.html";    Attr = "data-e2e-result" },
  @{ Name = "ALL suites";         File = "test\all.html";                  Attr = "data-all-result" }
)

$results = @()
foreach ($page in $pages) {
  $url = ([System.Uri]((Resolve-Path (Join-Path $root $page.File)).Path)).AbsoluteUri
  $profile = Join-Path $env:TEMP ("vd-run-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
  $args = "--headless=new --disable-gpu --no-sandbox --no-first-run --user-data-dir=$profile --virtual-time-budget=8000 --dump-dom `"$url`""
  $dumpFile = Join-Path $env:Temp ("vd-dump-" + [guid]::NewGuid().ToString("N").Substring(0, 8) + ".txt")
  $proc = Start-Process -FilePath $chrome -ArgumentList $args -Wait -PassThru -NoNewWindow `
           -RedirectStandardOutput $dumpFile -RedirectStandardError "$dumpFile.err"
  $dom = Get-Content $dumpFile -Raw
  if ($dom -match ($page.Attr + '="(PASS|FAIL)"')) {
    $results += [pscustomobject]@{ Suite = $page.Name; Result = $Matches[1]; Exit = $proc.ExitCode }
  } else {
    $results += [pscustomobject]@{ Suite = $page.Name; Result = "NO-RESULT"; Exit = $proc.ExitCode }
  }
  Remove-Item -Force $dumpFile, "$dumpFile.err" -ErrorAction SilentlyContinue
}

$results | Format-Table -AutoSize
$failed = $results | Where-Object { $_.Result -ne "PASS" }
if ($failed) {
  Write-Output "FAILED: $($failed.Count) of $($results.Count) checks."
  exit 1
}
Write-Output "ALL GREEN: $($results.Count)/$($results.Count) checks passed."
exit 0
