@echo off
cd /d %~dp0
@echo off
cd /d %~dp0
node node_modules\next\dist\bin/next build 2>next_err.txt 1>next_out.txt
echo NEXT_BUILD_EXIT_CODE:%ERRORLEVEL%


