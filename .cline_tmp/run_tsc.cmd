@echo off
cd /d c:\Users\HomePC\Documents\couples-corner\web
call npx tsc --noEmit --incremental false > c:\Users\HomePC\Documents\couples-corner\.cline_tmp\tsc.out 2>&1
echo EXIT=%ERRORLEVEL% >> c:\Users\HomePC\Documents\couples-corner\.cline_tmp\tsc.out
