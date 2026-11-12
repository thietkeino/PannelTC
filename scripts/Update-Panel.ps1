[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$extensionRoot = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Adobe\CEP\extensions'
$extensionPath = Join-Path $extensionRoot 'com.tc.illustrator.pannel'
$zipUrl = 'https://github.com/thietkeino/PannelTC/archive/refs/heads/main.zip'
$zipPath = Join-Path $env:TEMP 'pannel_tc_update.zip'
$extractPath = Join-Path $env:TEMP 'pannel_tc_extracted'

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Cap Nhat Extension: Pannel TC (Illustrator) " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (!(Test-Path $extensionPath)) {
    Write-Host "[!] Thu muc extension chua ton tai. Dang khoi tao: $extensionPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $extensionPath -Force | Out-Null
}

Write-Host "-> Dang tai ban cap nhat moi nhat tu GitHub..." -ForegroundColor Cyan
if (Test-Path $extractPath) { Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue }
$client = New-Object Net.WebClient
$client.Headers.Add("User-Agent", "PannelTC-Updater")
$client.DownloadFile($zipUrl, $zipPath)

Write-Host "-> Dang giai nen goi cap nhat..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

$sub = Get-ChildItem -Path $extractPath | Where-Object { $_.PSIsContainer } | Select-Object -First 1
$sourceDir = if ($sub) { $sub.FullName } else { $extractPath }

Write-Host "-> Dang ghi de tep vao thu muc Extension..." -ForegroundColor Cyan
try {
    & robocopy $sourceDir $extensionPath /E /IS /IT /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Robocopy exit code $LASTEXITCODE" }
} catch {
    Get-ChildItem -Path $sourceDir -Force | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $extensionPath -Recurse -Force
    }
}

Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=========================================" -ForegroundColor Green
Write-Host "[THANH CONG] Da cap nhat Pannel TC len ban moi nhat!" -ForegroundColor Green
Write-Host "Hay mo lai Adobe Illustrator hoac bam [F5] / [Reload] tren Panel de su dung." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
