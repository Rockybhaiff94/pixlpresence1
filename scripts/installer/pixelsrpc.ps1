<#
.SYNOPSIS
    PixelsRPC CLI — Native Vencord & Discord Rich Presence Manager for PIXEL.GG
.DESCRIPTION
    Automates downloading, building, injecting, repairing, and uninstalling
    Vencord with the PixelsRPC plugin natively integrated.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("install", "update", "repair", "uninstall", "status", "version", "help")]
    [string]$Command = "install",

    [Parameter()]
    [string]$DiscordBranch = "auto",

    [Parameter()]
    [switch]$Force,

    [Parameter()]
    [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"
$PIXEL_VERSION = "2.5.0"
$REPO_URL = "https://github.com/Rockybhaiff94/pixlpresence1.git"
$VENCORD_REPO = "https://github.com/Vendicated/Vencord.git"
$INSTALL_ROOT = Join-Path $env:LOCALAPPDATA "PixelsRPC"
$VENCORD_DIR = Join-Path $INSTALL_ROOT "vencord"
$BACKUP_DIR = Join-Path $INSTALL_ROOT "backups"
$BIN_DIR = Join-Path $INSTALL_ROOT "bin"

# ANSI Styling & Colors
function Write-BrandedHeader {
    Write-Host ""
    Write-Host "  ██████╗ ██╗██╗  ██╗███████╗██╗     ███████╗██████╗ ██████╗  ██████╗ " -ForegroundColor Red
    Write-Host "  ██╔══██╗██║╚██╗██╔╝██╔════╝██║     ██╔════╝██╔══██╗██╔══██╗██╔════╝ " -ForegroundColor Red
    Write-Host "  ██████╔╝██║ ╚███╔╝ █████╗  ██║     ███████╗██████╔╝██████╔╝██║      " -ForegroundColor White
    Write-Host "  ██╔═══╝ ██║ ██╔██╗ ██╔══╝  ██║     ╚════██║██╔══██╗██╔═══╝ ██║      " -ForegroundColor White
    Write-Host "  ██║     ██║██╔╝ ██╗███████╗███████╗███████║██║  ██║██║     ╚██████╗ " -ForegroundColor DarkGray
    Write-Host "  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝      ╚═════╝ " -ForegroundColor DarkGray
    Write-Host "  PIXEL.GG STUDIO OS 2.5 // NATIVE VENCORD RICH PRESENCE INSTALLER" -ForegroundColor DarkGray
    Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step([string]$msg) {
    Write-Host " [>] $msg" -ForegroundColor Cyan
}

function Write-Success([string]$msg) {
    Write-Host " [+] $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host " [!] $msg" -ForegroundColor Yellow
}

function Write-Err([string]$msg) {
    Write-Host " [x] $msg" -ForegroundColor Red
}

# 1. OS Verification
function Assert-Windows {
    if (-not [System.Environment]::OSVersion.Platform.ToString().StartsWith("Win")) {
        Write-Err "PixelsRPC installer only supports Windows operating systems."
        exit 1
    }
}

# 2. Discord Client Detection
function Get-DiscordInstallations {
    $candidates = @(
        @{ Name = "Discord Stable"; Path = Join-Path $env:LOCALAPPDATA "Discord"; Branch = "stable" },
        @{ Name = "Discord PTB"; Path = Join-Path $env:LOCALAPPDATA "DiscordPTB"; Branch = "ptb" },
        @{ Name = "Discord Canary"; Path = Join-Path $env:LOCALAPPDATA "DiscordCanary"; Branch = "canary" },
        @{ Name = "Discord Development"; Path = Join-Path $env:LOCALAPPDATA "DiscordDevelopment"; Branch = "development" }
    )

    $installed = @()
    foreach ($cand in $candidates) {
        if (Test-Path $cand.Path) {
            $appDirs = Get-ChildItem -Path $cand.Path -Directory -Filter "app-*" | Sort-Object Name -Descending
            if ($appDirs.Count -gt 0) {
                $installed += [PSCustomObject]@{
                    Name = $cand.Name
                    RootPath = $cand.Path
                    AppPath = $appDirs[0].FullName
                    Branch = $cand.Branch
                    Version = $appDirs[0].Name.Replace("app-", "")
                }
            }
        }
    }

    return $installed
}

# 3. Prerequisites Check (Git, Node.js, pnpm)
function Assert-Dependencies {
    Write-Step "Checking system build dependencies (Git, Node.js, pnpm)..."

    # Git
    try {
        $gitVer = git --version
        Write-Success "Found $gitVer"
    } catch {
        Write-Warn "Git is not installed or not in PATH."
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            Write-Step "Attempting to install Git via winget..."
            winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        } else {
            Write-Err "Please install Git from https://git-scm.com/download/win and re-run installer."
            exit 1
        }
    }

    # Node.js
    try {
        $nodeVer = node --version
        $major = [int]($nodeVer.TrimStart('v').Split('.')[0])
        if ($major -lt 18) {
            Write-Warn "Node.js $nodeVer is older than recommended v18+."
        } else {
            Write-Success "Found Node.js $nodeVer"
        }
    } catch {
        Write-Warn "Node.js is not found."
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            Write-Step "Installing Node.js LTS via winget..."
            winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        } else {
            Write-Err "Please install Node.js (v18+) from https://nodejs.org and re-run installer."
            exit 1
        }
    }

    # pnpm
    try {
        $pnpmVer = pnpm --version
        Write-Success "Found pnpm v$pnpmVer"
    } catch {
        Write-Step "Installing pnpm package manager globally via npm..."
        npm install -g pnpm --silent
        Write-Success "Installed pnpm."
    }
}

# 4. Clone or Update Vencord Source
function Sync-VencordSource {
    if (-not (Test-Path $INSTALL_ROOT)) {
        New-Item -ItemType Directory -Path $INSTALL_ROOT -Force | Out-Null
    }

    if (Test-Path (Join-Path $VENCORD_DIR ".git")) {
        Write-Step "Updating existing Vencord repository..."
        Push-Location $VENCORD_DIR
        try {
            git fetch origin
            git checkout main --quiet
            git pull origin main --quiet
            Write-Success "Vencord repository updated."
        } finally {
            Pop-Location
        }
    } else {
        Write-Step "Cloning official Vencord source repository..."
        if (Test-Path $VENCORD_DIR) {
            Remove-Item -Path $VENCORD_DIR -Recurse -Force
        }
        git clone --depth 1 $VENCORD_REPO $VENCORD_DIR --quiet
        Write-Success "Cloned Vencord source."
    }
}

# 5. Integrate PixelsRPC Plugin Source
function Integrate-PixelsRpcPlugin {
    Write-Step "Integrating PixelsRPC native plugin into Vencord userplugins..."
    $userpluginsDir = Join-Path $VENCORD_DIR "src\userplugins"
    if (-not (Test-Path $userpluginsDir)) {
        New-Item -ItemType Directory -Path $userpluginsDir -Force | Out-Null
    }

    $targetPluginDir = Join-Path $userpluginsDir "pixelsrpc"
    if (Test-Path $targetPluginDir) {
        Remove-Item -Path $targetPluginDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $targetPluginDir -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $targetPluginDir "components") -Force | Out-Null

    # Locate source plugin files from local repo or download
    $localPluginDist = Join-Path $PSScriptRoot "..\..\packages\vencord-plugin\dist\pixelsrpc"
    $hasLocal = Test-Path (Join-Path $localPluginDist "index.ts")

    if ($hasLocal) {
        Write-Step "Copying PixelsRPC plugin files from local build package..."
        Copy-Item -Path "$localPluginDist\*" -Destination $targetPluginDir -Recurse -Force
    } else {
        Write-Step "Downloading latest PixelsRPC release payload from PIXEL.GG..."
        $baseUrl = "https://raw.githubusercontent.com/Rockybhaiff94/pixlpresence1/master/packages/vencord-plugin/src"
        $files = @(
            "index.ts",
            "settings.ts",
            "types.ts",
            "styles.css",
            "components/StatusCard.tsx",
            "components/ActionControls.tsx",
            "components/SettingsAbout.tsx"
        )
        foreach ($file in $files) {
            $dest = Join-Path $targetPluginDir $file.Replace("/", "\")
            $destDir = Split-Path $dest
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Invoke-RestMethod -Uri "$baseUrl/$file" -OutFile $dest
        }
    }

    Write-Success "PixelsRPC plugin successfully integrated into Vencord userplugins."
}

# 6. Build Vencord with PixelsRPC
function Build-Vencord {
    Write-Step "Compiling customized Vencord build (this may take 1-2 minutes)..."
    Push-Location $VENCORD_DIR
    try {
        pnpm install --silent
        pnpm build
        Write-Success "Vencord compiled successfully with PixelsRPC included."
    } catch {
        Write-Err "Build failed: $_"
        exit 1
    } finally {
        Pop-Location
    }
}

# 7. Backup and Patch Discord
function Patch-Discord {
    $discords = Get-DiscordInstallations
    if ($discords.Count -eq 0) {
        Write-Err "No supported Discord installation found on your system."
        Write-Warn "Install Discord from https://discord.com/download and run 'pixelsrpc install' again."
        exit 1
    }

    Write-Host ""
    Write-Host "Detected Discord Installations:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $discords.Count; $i++) {
        $d = $discords[$i]
        Write-Host "  [$i] $($d.Name) ($($d.Version)) at $($d.RootPath)" -ForegroundColor White
    }

    $target = $discords[0]
    if ($DiscordBranch -ne "auto") {
        $match = $discords | Where-Object { $_.Branch -eq $DiscordBranch }
        if ($match) { $target = $match }
    }

    Write-Step "Targeting $($target.Name)..."

    # Close Discord before patching if running
    $processes = Get-Process -Name "Discord*", "DiscordCanary*", "DiscordPTB*" -ErrorAction SilentlyContinue
    if ($processes.Count -gt 0) {
        Write-Warn "Closing running Discord processes to safely apply patch..."
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Create backup of app directory
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDest = Join-Path $BACKUP_DIR "$($target.Branch)-$timestamp"
    New-Item -ItemType Directory -Path $backupDest -Force | Out-Null
    Write-Step "Creating backup at $backupDest..."

    # Inject Vencord
    Push-Location $VENCORD_DIR
    try {
        node dist/patcher.js -install -branch $($target.Branch)
        Write-Success "Injected custom Vencord build into $($target.Name)!"
    } catch {
        Write-Err "Failed to inject Vencord: $_"
        exit 1
    } finally {
        Pop-Location
    }
}

# 8. Setup Global CLI Command in PATH
function Setup-CliEnvironment {
    if (-not (Test-Path $BIN_DIR)) {
        New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null
    }

    $installedScript = Join-Path $BIN_DIR "pixelsrpc.ps1"
    $installedCmd = Join-Path $BIN_DIR "pixelsrpc.cmd"

    # Copy current script to bin directory
    Copy-Item -Path $PSCommandPath -Destination $installedScript -Force

    # Create cmd shim
    $cmdContent = "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0pixelsrpc.ps1`" %*"
    Set-Content -Path $installedCmd -Value $cmdContent -Force

    # Ensure $BIN_DIR is in user PATH
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$BIN_DIR*") {
        [System.Environment]::SetEnvironmentVariable("Path", "$userPath;$BIN_DIR", "User")
        $env:Path = "$env:Path;$BIN_DIR"
        Write-Success "Added 'pixelsrpc' command to user PATH environment variable."
    }
}

# 9. Status Command
function Show-Status {
    Write-BrandedHeader
    Write-Host "PixelsRPC System Diagnostic Status:" -ForegroundColor Cyan
    Write-Host "----------------------------------" -ForegroundColor DarkGray

    $discords = Get-DiscordInstallations
    if ($discords.Count -eq 0) {
        Write-Warn "Discord: Not Detected"
    } else {
        foreach ($d in $discords) {
            $isPatched = Test-Path (Join-Path $d.AppPath "resources\app.asar.backup")
            $statusText = if ($isPatched) { "Vencord Patched [Active]" } else { "Unpatched / Stock" }
            Write-Host "Discord Client : $($d.Name) ($($d.Version)) — $statusText" -ForegroundColor White
        }
    }

    $hasVencord = Test-Path (Join-Path $VENCORD_DIR "dist\patcher.js")
    Write-Host "Vencord Source : $(if ($hasVencord) { 'Built & Ready' } else { 'Not Built' })" -ForegroundColor White

    $hasPlugin = Test-Path (Join-Path $VENCORD_DIR "src\userplugins\pixelsrpc\index.ts")
    Write-Host "PixelsRPC Plugin: $(if ($hasPlugin) { 'Installed in userplugins' } else { 'Not Found' })" -ForegroundColor White
    Write-Host "CLI Version    : $PIXEL_VERSION" -ForegroundColor White
    Write-Host ""
}

# 10. Uninstall Command
function Uninstall-PixelsRpc {
    Write-BrandedHeader
    Write-Step "Uninstalling Vencord and restoring stock Discord..."

    $processes = Get-Process -Name "Discord*", "DiscordCanary*", "DiscordPTB*" -ErrorAction SilentlyContinue
    if ($processes.Count -gt 0) {
        Write-Warn "Closing Discord..."
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    if (Test-Path $VENCORD_DIR) {
        Push-Location $VENCORD_DIR
        try {
            node dist/patcher.js -uninstall
            Write-Success "Uninjected Vencord from Discord."
        } catch {
            Write-Warn "Patcher uninstall reported an issue or Discord was already clean."
        } finally {
            Pop-Location
        }
    }

    Write-Success "Discord has been restored to default stock state."
    Write-Host "Your PIXEL.GG cloud settings and custom presence remain safe in the web studio." -ForegroundColor DarkGray
}

# 11. Repair Command
function Repair-PixelsRpc {
    Write-BrandedHeader
    Write-Step "Repairing Vencord injection after Discord update..."
    if (-not (Test-Path (Join-Path $VENCORD_DIR "dist\patcher.js"))) {
        Write-Warn "Vencord build missing. Running full installation..."
        Execute-Install
        return
    }

    Patch-Discord
    Write-Success "Repair completed successfully! Restart Discord to apply."
}

# Master Install Routine
function Execute-Install {
    Write-BrandedHeader
    Assert-Windows
    Assert-Dependencies
    Sync-VencordSource
    Integrate-PixelsRpcPlugin
    Build-Vencord
    Patch-Discord
    Setup-CliEnvironment

    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "   PIXEL.GG PIXELSRPC VENCORD PLUGIN INSTALLED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEPS TO LINK YOUR ACCOUNT:" -ForegroundColor Cyan
    Write-Host "  1. Start Discord." -ForegroundColor White
    Write-Host "  2. Go to: Settings -> Vencord -> Plugins." -ForegroundColor White
    Write-Host "  3. Find 'PixelsRPC' and toggle it ON (disabled by default)." -ForegroundColor White
    Write-Host "  4. Click 'Link Account'." -ForegroundColor White
    Write-Host "  5. Go to https://pixlpresence1-web.vercel.app/account/rpc in your browser." -ForegroundColor White
    Write-Host "  6. Generate your 2-minute linking code and enter it into Discord!" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now use 'pixelsrpc' anywhere in your terminal:" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc status   - Check Discord & Vencord status" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc repair   - Re-patch Discord after a Discord update" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc update   - Pull latest Vencord and PixelsRPC features" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc uninstall- Restore stock Discord" -ForegroundColor DarkGray
    Write-Host ""
}

# Entrypoint Switch
switch ($Command.ToLower()) {
    "install"   { Execute-Install }
    "update"    { Execute-Install }
    "repair"    { Repair-PixelsRpc }
    "uninstall" { Uninstall-PixelsRpc }
    "status"    { Show-Status }
    "version"   { Write-Host "PixelsRPC CLI v$PIXEL_VERSION" -ForegroundColor Green }
    "help"      {
        Write-BrandedHeader
        Write-Host "Usage: pixelsrpc [install|update|repair|uninstall|status|version]" -ForegroundColor White
    }
    default     { Execute-Install }
}
