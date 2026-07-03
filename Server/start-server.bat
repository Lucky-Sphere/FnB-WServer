@echo off
cd /d "%~dp0"
call "%~dp0..\setup-firewall.bat"
echo Stopping any leftover services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":20080 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5433 "') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting FNB Server...
go run ./cmd/server
pause
