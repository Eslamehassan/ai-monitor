# AI Monitor - Windows Service Installer
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install-service.ps1

param(
    [string]$Action = "install",
    [string]$InstallDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ServiceName = "AIMonitor"
$DisplayName = "AI Monitor - Claude Code Session Monitor"
$Description = "Local monitoring dashboard for Claude Code sessions"

$RunScript = Join-Path $InstallDir "run.bat"
$LogDir = Join-Path $InstallDir "logs"

function Install-Service {
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }

    # Create a wrapper batch file for Windows
    $BatContent = @"
@echo off
cd /d "$InstallDir\backend"
if not exist ".venv" (
    uv venv
    uv pip install -e ".[dev]"
)
if not exist "static\index.html" (
    cd /d "$InstallDir\frontend"
    call bun install
    call bun run build
    cd /d "$InstallDir\backend"
)
uv run python -m ai_monitor
"@
    Set-Content -Path $RunScript -Value $BatContent

    # Use NSSM if available, otherwise use sc.exe with a wrapper
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssm) {
        & nssm install $ServiceName $RunScript
        & nssm set $ServiceName DisplayName $DisplayName
        & nssm set $ServiceName Description $Description
        & nssm set $ServiceName AppDirectory $InstallDir
        & nssm set $ServiceName AppStdout (Join-Path $LogDir "ai-monitor.log")
        & nssm set $ServiceName AppStderr (Join-Path $LogDir "ai-monitor.err")
        & nssm set $ServiceName AppEnvironmentExtra "AI_MONITOR_PORT=6820"
        & nssm set $ServiceName AppRestartDelay 5000
        Write-Host "Service installed with NSSM. Start with: nssm start $ServiceName"
    }
    else {
        # Register as a scheduled task that runs at logon (no NSSM fallback)
        $TaskAction = New-ScheduledTaskAction -Execute $RunScript -WorkingDirectory $InstallDir
        $TaskTrigger = New-ScheduledTaskTrigger -AtLogon
        $TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
        Register-ScheduledTask -TaskName $ServiceName -Action $TaskAction -Trigger $TaskTrigger -Settings $TaskSettings -Description $Description -Force
        Write-Host "Registered as scheduled task (NSSM not found)."
        Write-Host "Start with: schtasks /run /tn $ServiceName"
    }
    Write-Host "AI Monitor installed successfully."
}

function Uninstall-Service {
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssm) {
        & nssm stop $ServiceName 2>$null
        & nssm remove $ServiceName confirm
    }
    else {
        Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false -ErrorAction SilentlyContinue
    }
    if (Test-Path $RunScript) { Remove-Item $RunScript }
    Write-Host "AI Monitor uninstalled."
}

switch ($Action) {
    "install"   { Install-Service }
    "uninstall" { Uninstall-Service }
    default     { Write-Host "Usage: install-service.ps1 -Action [install|uninstall]" }
}
