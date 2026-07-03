@echo off
echo Setting up Windows Firewall rules for FNB...

REM FNB Server API
netsh advfirewall firewall add rule name="FNB Server HTTP" dir=in action=allow protocol=TCP localport=20080 >nul 2>&1
netsh advfirewall firewall add rule name="FNB Server HTTPS" dir=in action=allow protocol=TCP localport=20443 >nul 2>&1

REM Embedded PostgreSQL (LAN access for debug)
netsh advfirewall firewall add rule name="FNB PostgreSQL" dir=in action=allow protocol=TCP localport=5433 >nul 2>&1

REM Admin & Cashier Vite
netsh advfirewall firewall add rule name="FNB Admin" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1
netsh advfirewall firewall add rule name="FNB Cashier" dir=in action=allow protocol=TCP localport=5175 >nul 2>&1

echo Firewall rules configured.
