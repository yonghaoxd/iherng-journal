@echo off
rem Started by Windows Task Scheduler every morning (see scripts/install-auto-journal.ps1).
rem Output goes to .cache\auto-journal\task-output.txt; the job's own log is log.txt beside it.
cd /d "%~dp0.."
if not exist ".cache\auto-journal" mkdir ".cache\auto-journal"
echo ===== %date% %time% >> ".cache\auto-journal\task-output.txt"
call npm.cmd run auto:journal >> ".cache\auto-journal\task-output.txt" 2>&1
