@echo off
call "%~dp0setup-firewall.bat"

echo Stopping any leftover services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":20080 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5433 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8082 "') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting all FNB services...
start "FNB Server" cmd /c "cd /d %~dp0Server && go run ./cmd/server"
timeout /t 10 /nobreak >nul

start "FNB Admin" cmd /c "cd /d %~dp0Admin && npm run dev"
start "FNB Cashier" cmd /c "cd /d %~dp0Cashier && npm run dev"

start "FNB Client" cmd /c "cd /d %~dp0Client && npm run start -- --port 8081"
start "FNB Kitchen" cmd /c "cd /d %~dp0Kitchen && npm run start -- --port 8082"

echo All services started.