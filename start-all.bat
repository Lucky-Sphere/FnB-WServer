@echo off
call "%~dp0setup-firewall.bat"

echo Stopping any leftover services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":20080 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5433 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8082 "') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting all FNB services...
start "FNB Server" cmd /c "title FNB Server && cd /d %~dp0Server && go run ./cmd/server"
timeout /t 10 /nobreak >nul

start "FNB Admin" cmd /c "title FNB Admin && cd /d %~dp0Admin && call start-service.bat"
start "FNB Cashier" cmd /c "title FNB Cashier && cd /d %~dp0Cashier && call start-service.bat"

start "FNB Client" cmd /c "title FNB Client && cd /d %~dp0Client && call start-service.bat"
start "FNB Kitchen" cmd /c "title FNB Kitchen && cd /d %~dp0Kitchen && call start-service.bat"

echo All services started.