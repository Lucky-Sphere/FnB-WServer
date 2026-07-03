@echo off
cd /d "%~dp0"
echo [FNB] Starting kitchen...
cd Kitchen
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "line=%%a"
    setlocal enabledelayedexpansion
    set "ip=!line: =!"
    if not "!ip!"=="127.0.0.1" if "!ip:~0,3!"=="192" (
        endlocal && set "IP=%%a" && goto :foundip
    )
    endlocal
)
:foundip
set IP=%IP: =%
if "%IP%"=="" set IP=192.168.68.133
set REACT_NATIVE_PACKAGER_HOSTNAME=%IP%
echo [FNB] Host IP: %IP%
npx expo start --port 8082
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FNB] Kitchen exited with error code %ERRORLEVEL%
    pause
)
