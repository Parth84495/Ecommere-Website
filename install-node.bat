@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-node.ps1"
exit /b %ERRORLEVEL%
endlocal
