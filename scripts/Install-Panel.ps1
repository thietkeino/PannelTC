[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$extensionRoot = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Adobe\CEP\extensions'
$extensionPath = Join-Path $extensionRoot 'com.tc.illustrator.pannel'
$manifestPath = Join-Path $projectRoot 'CSXS\manifest.xml'

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Cai dat Extension: Pannel TC (Illustrator) " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Kiem tra tap tin
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw 'Khong tim thay CSXS/manifest.xml'
}

[xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw
if ($manifest.ExtensionManifest.ExtensionBundleId -ne 'com.tc.illustrator.pannel') {
    throw 'Extension BundleId khong dung.'
}

$requiredFiles = @(
    'client\index.html',
    'client\css\panel.css',
    'client\js\bridge.js',
    'client\js\panel.js',
    'host\illustrator.jsx',
    'host\AutoDimensionGroups_Illustrator2024.jsx',
    'host\DTF_AutoNest_A3 copy.jsx',
    'host\ExportArtboard.jsx',
    'templates\Xuong gom viet bat trang 1 mat.ait',
    'templates\bat trang viet nam 1 mat.ait',
    'templates\day ko in 1 mat.ait'
)

foreach ($rel in $requiredFiles) {
    $full = Join-Path $projectRoot $rel
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        throw "Thieu tap tin: $rel"
    }
}

# 2. Tao thu muc Adobe CEP neu chua co
New-Item -ItemType Directory -Path $extensionRoot -Force | Out-Null

# 3. Cai dat extension vao Adobe CEP (Thu Junction truoc, neu loi se Copy truc tiep)
$existing = Get-Item -LiteralPath $extensionPath -Force -ErrorAction SilentlyContinue
if ($existing) {
    if ($existing.LinkType -eq 'Junction') {
        $target = @($existing.Target)[0]
        if ($target -and [System.IO.Path]::GetFullPath($target).TrimEnd('\') -ieq $projectRoot) {
            Write-Host "[OK] Lien ket cai dat da ton tai dung thu muc." -ForegroundColor Green
        } else {
            $existing.Delete()
            New-Item -ItemType Junction -Path $extensionPath -Target $projectRoot | Out-Null
            Write-Host "[OK] Da cap nhat lai lien ket Junction." -ForegroundColor Green
        }
    } else {
        # Thu muc thuong da co tu truoc, xoa di de tao lien ket moi
        Remove-Item -LiteralPath $extensionPath -Recurse -Force -ErrorAction SilentlyContinue
        try {
            New-Item -ItemType Junction -Path $extensionPath -Target $projectRoot | Out-Null
            Write-Host "[OK] Da tao lien ket Junction thanh cong." -ForegroundColor Green
        } catch {
            New-Item -ItemType Directory -Path $extensionPath -Force | Out-Null
            Copy-Item -Path (Join-Path $projectRoot '*') -Destination $extensionPath -Recurse -Force
            Write-Host "[OK] Da sao chep extension truc tiep vao Adobe CEP." -ForegroundColor Green
        }
    }
} else {
    try {
        New-Item -ItemType Junction -Path $extensionPath -Target $projectRoot | Out-Null
        Write-Host "[OK] Da tao lien ket Junction thanh cong." -ForegroundColor Green
    } catch {
        New-Item -ItemType Directory -Path $extensionPath -Force | Out-Null
        Copy-Item -Path (Join-Path $projectRoot '*') -Destination $extensionPath -Recurse -Force
        Write-Host "[OK] Da sao chep extension truc tiep vao Adobe CEP." -ForegroundColor Green
    }
}

# 4. Kich hoat PlayerDebugMode
Write-Host "[...] Dang kich hoat PlayerDebugMode..." -ForegroundColor Gray
$runtimes = @('9', '10', '11', '12', '13', '14')
foreach ($rt in $runtimes) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$rt"
    try {
        New-Item -Path $regPath -Force | Out-Null
        New-ItemProperty -Path $regPath -Name 'PlayerDebugMode' -Value '1' -PropertyType String -Force | Out-Null
    } catch {
        Write-Warning "Khong the ghi Registry cho CSXS.$rt"
    }
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host " CAI DAT HOAN TAT!" -ForegroundColor Green
Write-Host " Thu muc nguon: $projectRoot" -ForegroundColor White
Write-Host " Thu muc CEP:   $extensionPath" -ForegroundColor White
Write-Host "-----------------------------------------" -ForegroundColor Gray
Write-Host " HUONG DAN MO TRONG ILLUSTRATOR 2024:" -ForegroundColor Yellow
Write-Host " 1. Hay khoi dong lai Adobe Illustrator neu dang mo." -ForegroundColor White
Write-Host " 2. Vao menu: Window -> Extensions -> Pannel TC" -ForegroundColor Cyan
Write-Host " 3. Keo tab 'Pannel TC' vao thanh panel ben phai de ghim." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Green
