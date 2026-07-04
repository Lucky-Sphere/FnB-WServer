@echo off
title FNB Server
cd /d "%~dp0"
cls
echo ==============================
echo        FNB SERVER
echo ==============================
echo.
call "%~dp0..\setup-firewall.bat"
echo Stopping any leftover services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":20080 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5433 "') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

go run ./cmd/server
pause
