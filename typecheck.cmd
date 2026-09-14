@echo off
cd /d "%~dp0web-admin"
npx tsc --noEmit
echo TypeScript check completed