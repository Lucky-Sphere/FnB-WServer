@echo off
title FNB Client
cd /d "%~dp0"
cls
echo ==============================
echo        FNB CLIENT
echo ==============================
echo.
npx expo start --port 8081
