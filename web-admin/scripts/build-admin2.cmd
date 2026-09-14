@echo off
cd /d "%~dp0.."
echo BUILD START %date% %time% > "%TEMP%\wa-build2.log"
call npm run build >> "%TEMP%\wa-build2.log" 2>&1
echo BUILD DONE EXITCODE %ERRORLEVEL% >> "%TEMP%\wa-build2.log"
