# Copy repo collection.db into the portable SleeveStack folder (after git pull).
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$src = "$Root\data\collection.db"
$destDir = "$Root\dist\SleeveStack\data"
$dest = "$destDir\collection.db"

if (-not (Test-Path $src)) {
    Write-Error "Missing $src — pull the repo or build the database on this machine first."
}
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item $src $dest -Force
Write-Host "Copied database to $dest" -ForegroundColor Green
Write-Host "Restart SleeveStack.exe, then open http://127.0.0.1:8765/api/health to verify genre/country counts."
