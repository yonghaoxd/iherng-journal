# Registers the daily "Ask Sean - auto journal" task for the current Windows user.
#   powershell -ExecutionPolicy Bypass -File scripts\install-auto-journal.ps1
# Remove it with:
#   Unregister-ScheduledTask -TaskName "Ask Sean - auto journal" -Confirm:$false
param([string]$At = "9:00am")

$root = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $root "scripts\auto-journal.cmd"

# conhost --headless runs the job without a console window popping up.
$action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless cmd.exe /c `"$launcher`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $At
# StartWhenAvailable: if the computer was off at the scheduled time, run at the next chance.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName "Ask Sean - auto journal" -Action $action -Trigger $trigger -Settings $settings `
  -Description "Writes iherng Journal articles for new Asking Sean videos and publishes them (asking_iherng/scripts/auto-journal.ts)." `
  -Force | Out-Null

Get-ScheduledTask -TaskName "Ask Sean - auto journal" | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
