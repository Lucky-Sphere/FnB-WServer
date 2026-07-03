@echo off
cd /d "%~dp0Cashier"
start "Cashier" cmd /c "npx vite --host 2>&1"
