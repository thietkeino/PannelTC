[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$extensionRoot = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Adobe\CEP\extensions'
$extensionPath = Join-Path $extensionRoot 'com.tc.illustrator.pannel'

Write-Host "Dang go bo lien ket Pannel TC..." -ForegroundColor Yellow

$existing = Get-Item -LiteralPath $extensionPath -Force -ErrorAction SilentlyContinue
if ($existing) {
    Remove-Item -LiteralPath $extensionPath -Recurse -Force
    Write-Host "[OK] Da go bo extension com.tc.illustrator.pannel khoi Adobe CEP." -ForegroundColor Green
} else {
    Write-Host "[Info] Khong tim thay extension com.tc.illustrator.pannel." -ForegroundColor Gray
}

Write-Host "Khoi dong lai Adobe Illustrator de hoan tat." -ForegroundColor White
