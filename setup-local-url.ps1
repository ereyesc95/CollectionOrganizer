# Optional: map a shorter custom name to this PC (requires Administrator).
# After running, you can use http://recordstack.local:8000 instead of recordstack.localhost
$ErrorActionPreference = "Stop"
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1 recordstack.local"
$marker = "# RecordStack local app"

$content = Get-Content $hostsPath -Raw -ErrorAction Stop
if ($content -match "recordstack\.local\b") {
    Write-Host "hosts already contains recordstack.local" -ForegroundColor Green
    exit 0
}

$block = "`n$marker`n$entry`n"
Add-Content -Path $hostsPath -Value $block -Encoding ascii
Write-Host "Added recordstack.local -> 127.0.0.1" -ForegroundColor Green
Write-Host "Use http://recordstack.local:8000 (or your exe port) in the browser."
Write-Host "Default without this script: http://recordstack.localhost:8000 (no admin needed)."
