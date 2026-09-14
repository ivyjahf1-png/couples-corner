@echo off
cd /d "%~dp0web-admin"
npx next lint --help | findstr /i "file"
echo.
npx next lint
echo Lint check completed