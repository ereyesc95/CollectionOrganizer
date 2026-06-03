# Build SleeveStack standalone Windows app (run from project root in PowerShell)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host "=== SleeveStack build ===" -ForegroundColor Cyan

# 1. Frontend
Write-Host "`n[1/5] Building UI..." -ForegroundColor Yellow
Push-Location "$Root\frontend"
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run build
Pop-Location

if (-not (Test-Path "$Root\frontend\dist\index.html")) {
    throw "Frontend build failed: frontend\dist\index.html missing"
}

# 2. Python dependencies
Write-Host "`n[2/5] Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r "$Root\backend\requirements.txt" -q
python -m pip install -r "$Root\build-requirements.txt" -q

# 3. Optional icon
$iconPath = "$Root\assets\SleeveStack.ico"
if (-not (Test-Path $iconPath)) {
    Write-Host "  (No assets\SleeveStack.ico - exe will use default icon)" -ForegroundColor DarkGray
}

# 4. PyInstaller
Write-Host "`n[3/5] Running PyInstaller (may take a few minutes)..." -ForegroundColor Yellow
Push-Location $Root
python -m PyInstaller --clean --noconfirm SleeveStack.spec
Pop-Location

$outDir = "$Root\dist\SleeveStack"
$exe = "$outDir\SleeveStack.exe"
if (-not (Test-Path $exe)) {
    throw "Build failed: $exe not found"
}

# Copy sample spreadsheet beside exe if present
if (Test-Path "$Root\Collection.xlsx") {
    Copy-Item "$Root\Collection.xlsx" "$outDir\Collection.xlsx" -Force
}
if (Test-Path "$Root\assets\PHONE_ACCESS.txt") {
    Copy-Item "$Root\assets\PHONE_ACCESS.txt" "$outDir\PHONE_ACCESS.txt" -Force
}

# Copy UI next to exe (backup if _internal path differs on some machines)
$feOut = "$outDir\frontend\dist"
New-Item -ItemType Directory -Force -Path $feOut | Out-Null
Copy-Item -Path "$Root\frontend\dist\*" -Destination $feOut -Recurse -Force

# Copy collection database beside exe (portable zip without full git clone)
if (Test-Path "$Root\data\collection.db") {
    $dataOut = "$outDir\data"
    New-Item -ItemType Directory -Force -Path $dataOut | Out-Null
    Copy-Item "$Root\data\collection.db" "$dataOut\collection.db" -Force
    Write-Host "  Copied data\collection.db -> dist\SleeveStack\data\" -ForegroundColor Green
}

Write-Host "`n[4/5] Creating ZIP portable package..." -ForegroundColor Yellow
$zipPath = "$Root\dist\SleeveStack-portable.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $outDir -DestinationPath $zipPath -Force

Write-Host "`n[5/5] Optional Windows installer..." -ForegroundColor Yellow
$iscc = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($iscc) {
    & $iscc "$Root\installer\installer.iss"
    Write-Host "  Created dist\SleeveStack-Setup-1.0.0.exe" -ForegroundColor Green
} else {
    Write-Host "  Inno Setup 6 not installed - skipped Setup.exe (portable ZIP is ready)" -ForegroundColor DarkGray
}

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "  Run:     $exe"
Write-Host "  Portable ZIP: $zipPath"
Write-Host "`nOptional: install Inno Setup 6, then compile installer\installer.iss for Setup.exe"
