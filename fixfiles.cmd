@echo off
REM Restore settings page (relative to this script's folder)
copy /y "%~dp0web-admin\app\admin\settings\page.tsx.bak" "%~dp0web-admin\app\admin\settings\page.tsx" >nul 2>&1
echo Done