@echo off
cd /d "c:\Users\HomePC\Documents\couple's conner\web"
call node node_modules\next\dist\bin\next build > build_gcb_log.txt 2>&1
if errorlevel 1 (echo BUILD_FAIL>>build_gcb_log.txt) else (echo BUILD_PASS>>build_gcb_log.txt)
