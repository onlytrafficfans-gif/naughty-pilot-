@echo off
cd /d "%~dp0"
node launch.cjs
if errorlevel 1 pause
