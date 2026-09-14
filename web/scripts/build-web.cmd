@echo off
cd /d "%~dp0.."
echo BUILD START > "%TEMP%\web-build.log"
call npm run build >> "%TEMP%\web-build.log" 2>&1
echo BUILD DONE EXITCODE %ERRORLEVEL% >> "%TEMP%\web-build.log"

