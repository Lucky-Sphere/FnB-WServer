@echo off
cd /d "%~dp0"
echo [FNB] Starting admin app...
cd Admin
npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FNB] Admin exited with error code %ERRORLEVEL%
    pause
)
