@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Update-Panel.ps1"
if errorlevel 1 (
  echo.
  echo [LỖI] Cập nhật thất bại. Vui lòng kiểm tra kết nối mạng.
  pause
  exit /b 1
)
echo.
pause
