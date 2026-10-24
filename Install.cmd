@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Install-Panel.ps1"
if errorlevel 1 (
  echo.
  echo [LỖI] Cài đặt thất bại. Vui lòng xem thông báo lỗi phía trên.
  pause
  exit /b 1
)
echo.
pause
