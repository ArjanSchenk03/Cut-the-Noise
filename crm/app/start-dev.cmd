@echo off
REM Start de XYZ-CRM dev-server. Dubbelklik dit bestand of run het in een terminal.
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
if not exist node_modules (
  echo Eerste keer: dependencies installeren...
  call npm install --no-fund --no-audit
)
echo Server start op http://localhost:5174
call npm run dev
endlocal
