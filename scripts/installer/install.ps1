<#
.SYNOPSIS
    PIXEL.GG PixelsRPC One-Click Bootstrap Installer
.DESCRIPTION
    Runs: irm https://pixlpresence1-web.vercel.app/install.ps1 | iex
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host " [PIXEL.GG] Initializing PixelsRPC Vencord Installer..." -ForegroundColor Red
Write-Host " [PIXEL.GG] Detecting system architecture and privileges..." -ForegroundColor DarkGray

if (-not [System.Environment]::OSVersion.Platform.ToString().StartsWith("Win")) {
    Write-Host " [!] PixelsRPC installer only supports Windows." -ForegroundColor Red
    exit 1
}

$InstallRoot = Join-Path $env:LOCALAPPDATA "PixelsRPC"
$BinDir = Join-Path $InstallRoot "bin"
$ScriptDest = Join-Path $BinDir "pixelsrpc.ps1"
$CmdDest = Join-Path $BinDir "pixelsrpc.cmd"

if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
}

$RemoteScriptUrl = "https://raw.githubusercontent.com/Rockybhaiff94/pixlpresence1/master/scripts/installer/pixelsrpc.ps1"
$RemoteCmdUrl = "https://raw.githubusercontent.com/Rockybhaiff94/pixlpresence1/master/scripts/installer/pixelsrpc.cmd"

Write-Host " [PIXEL.GG] Fetching latest installer package..." -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri $RemoteScriptUrl -OutFile $ScriptDest
    Invoke-RestMethod -Uri $RemoteCmdUrl -OutFile $CmdDest
} catch {
    Write-Host " [!] Could not fetch from GitHub, falling back to local workspace payload..." -ForegroundColor Yellow
    $LocalScript = Join-Path $PSScriptRoot "pixelsrpc.ps1"
    if (Test-Path $LocalScript) {
        Copy-Item -Path $LocalScript -Destination $ScriptDest -Force
    }
}

# Add to user PATH if not present
$UserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$BinDir*") {
    [System.Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinDir", "User")
    $env:Path = "$env:Path;$BinDir"
}

# Execute main install routine
& powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptDest install
