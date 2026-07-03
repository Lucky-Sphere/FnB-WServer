@echo off
cd /d "%~dp0"
echo [FNB] Starting server on HTTP :20080 / HTTPS :20443...
set PATH=C:\Go\bin;%PATH%
cd Server
go run ./cmd/server
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FNB] Server exited with error code %ERRORLEVEL%
    pause
)
