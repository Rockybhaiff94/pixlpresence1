<#
.SYNOPSIS
    PixelsRPC CLI — Native Vencord & Discord Rich Presence Manager for PIXEL.GG
.DESCRIPTION
    Automates downloading, building, injecting, repairing, rolling back,
    and uninstalling Vencord with the PixelsRPC plugin natively integrated.
    Fully compatible with Windows PowerShell 5.1 and PowerShell 7+.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("install", "update", "repair", "rollback", "uninstall", "status", "version", "help")]
    [string]$Command = "install",

    [Parameter()]
    [string]$DiscordBranch = "auto",

    [Parameter()]
    [switch]$Force,

    [Parameter()]
    [switch]$NoPrompt,

    [Parameter()]
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$PIXEL_VERSION = "2.5.1"
$REPO_URL = "https://github.com/Rockybhaiff94/pixlpresence1.git"
$VENCORD_REPO = "https://github.com/Vendicated/Vencord.git"
$INSTALL_ROOT = Join-Path $env:LOCALAPPDATA "PixelsRPC"
$VENCORD_DIR = Join-Path $INSTALL_ROOT "vencord"
$BACKUP_DIR = Join-Path $INSTALL_ROOT "backups"
$BIN_DIR = Join-Path $INSTALL_ROOT "bin"

# Active execution runner for pnpm
$script:PnpmRunner = "pnpm"
$script:CurrentBackupPath = $null
$script:TargetDiscordClient = $null

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

function Write-Preflight([string]$name, [string]$status, [string]$detail = "") {
    switch ($status) {
        "pass" { Write-Host "  [✓] $name" -ForegroundColor Green }
        "fail" {
            Write-Host "  [✗] $name" -ForegroundColor Red
            if ($detail) {
                Write-Host ""
                Write-Host "      Reason:" -ForegroundColor DarkRed
                Write-Host "      $detail" -ForegroundColor DarkRed
                Write-Host ""
            }
        }
        "info" { Write-Host "  [>] $name..." -ForegroundColor Cyan }
        "warn" {
            Write-Host "  [!] $name" -ForegroundColor Yellow
            if ($detail) { Write-Host "      $detail" -ForegroundColor Yellow }
        }
    }
}

# Strict Native Command Execution Helper
function Invoke-NativeProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    & $Action
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Failed to ${Description}: process exited with non-zero code ($exitCode)."
    }
}

# 1. OS Verification
function Assert-WindowsCompatibility {
    $isWin = [System.Environment]::OSVersion.Platform.ToString().StartsWith("Win")
    if (-not $isWin) {
        Write-Preflight "Windows compatibility" "fail" "PixelsRPC installer only supports Windows operating systems."
        exit 1
    }
    Write-Preflight "Windows compatibility" "pass"
}

# 2. Discord Client Detection
function Get-DiscordInstallations {
    $candidates = @(
        @{ Name = "Discord PTB"; Path = Join-Path $env:LOCALAPPDATA "DiscordPTB"; Branch = "ptb" },
        @{ Name = "Discord Stable"; Path = Join-Path $env:LOCALAPPDATA "Discord"; Branch = "stable" },
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
function Assert-BuildPrerequisites {
    # Git
    try {
        $gitVer = (git --version 2>$null)
        if (-not $gitVer) { throw "Git not in path" }
        Write-Preflight "Git detected ($($gitVer.Trim()))" "pass"
    } catch {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            Write-Step "Attempting to install Git via winget..."
            winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            $gitVer = (git --version 2>$null)
            if ($gitVer) {
                Write-Preflight "Git detected after installation ($($gitVer.Trim()))" "pass"
            } else {
                Write-Preflight "Git detected" "fail" "Git was not found after winget install. Please install from https://git-scm.com."
                exit 1
            }
        } else {
            Write-Preflight "Git detected" "fail" "Git is required. Please install Git from https://git-scm.com and re-run."
            exit 1
        }
    }

    # Node.js
    try {
        $nodeVer = (node --version 2>$null)
        if (-not $nodeVer) { throw "Node not found" }
        $major = [int]($nodeVer.Trim().TrimStart('v').Split('.')[0])
        if ($major -lt 18) {
            Write-Preflight "Node.js detected ($nodeVer)" "fail" "Node.js version must be v18 or newer (v22+ recommended)."
            exit 1
        }
        Write-Preflight "Node.js detected ($($nodeVer.Trim()))" "pass"
    } catch {
        Write-Preflight "Node.js detected" "fail" "Node.js is not found. Please install Node.js v22 LTS from https://nodejs.org."
        exit 1
    }
}

# 4. pnpm Version Verification & Strict Management
function Assert-PnpmVersionManagement {
    $packageJsonPath = Join-Path $VENCORD_DIR "package.json"
    $requiredPnpm = "12.15.0"
    if (Test-Path $packageJsonPath) {
        try {
            $pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
            if ($pkg.packageManager -match 'pnpm@([0-9\.]+)') {
                $requiredPnpm = $matches[1]
            }
        } catch { }
    }

    $currentPnpm = $null
    try {
        $pnpmOut = (pnpm --version 2>$null)
        if ($pnpmOut) { $currentPnpm = $pnpmOut.Trim() }
    } catch { }

    if ($currentPnpm -eq $requiredPnpm) {
        $script:PnpmRunner = "pnpm"
        Write-Preflight "pnpm version verified (v$currentPnpm)" "pass"
        return
    }

    # Attempt to activate via Corepack
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        try {
            corepack prepare "pnpm@$requiredPnpm" --activate 2>$null
            $updatedPnpm = (pnpm --version 2>$null)
            if ($updatedPnpm -and $updatedPnpm.Trim() -eq $requiredPnpm) {
                $script:PnpmRunner = "pnpm"
                Write-Preflight "pnpm version verified via Corepack (v$requiredPnpm)" "pass"
                return
            }
        } catch { }
    }

    # Attempt to install exact required version via npm
    try {
        Write-Step "Configuring pnpm v$requiredPnpm to match Vencord requirement..."
        npm install -g "pnpm@$requiredPnpm" --silent
        $updatedPnpm = (pnpm --version 2>$null)
        if ($updatedPnpm -and $updatedPnpm.Trim() -eq $requiredPnpm) {
            $script:PnpmRunner = "pnpm"
            Write-Preflight "pnpm version verified (v$requiredPnpm)" "pass"
            return
        }
    } catch { }

    # Fallback to npx runner for isolated execution
    try {
        $npxCheck = (npx "pnpm@$requiredPnpm" --version 2>$null)
        if ($npxCheck -and $npxCheck.Trim() -eq $requiredPnpm) {
            $script:PnpmRunner = "npx pnpm@$requiredPnpm"
            Write-Preflight "pnpm version verified via npx runner (v$requiredPnpm)" "pass"
            return
        }
    } catch { }

    # If already installed pnpm exists and is functional, use it with a notice
    if ($currentPnpm) {
        $script:PnpmRunner = "pnpm"
        Write-Preflight "pnpm version active (v$currentPnpm, recommended $requiredPnpm)" "warn"
        return
    }

    Write-Preflight "pnpm version verified" "fail" "Unable to activate or install pnpm v$requiredPnpm."
    exit 1
}

# 5. Clone or Update Vencord Source
function Sync-VencordSource {
    if (-not (Test-Path $INSTALL_ROOT)) {
        New-Item -ItemType Directory -Path $INSTALL_ROOT -Force | Out-Null
    }

    if (Test-Path (Join-Path $VENCORD_DIR ".git")) {
        Push-Location $VENCORD_DIR
        try {
            git fetch origin --quiet
            git checkout main --quiet
            git pull origin main --quiet
            Write-Preflight "Vencord source updated" "pass"
        } catch {
            Write-Preflight "Vencord source updated" "warn" "Using existing local clone of Vencord source."
        } finally {
            Pop-Location
        }
    } else {
        if (Test-Path $VENCORD_DIR) {
            Remove-Item -Path $VENCORD_DIR -Recurse -Force
        }
        try {
            git clone --depth 1 $VENCORD_REPO $VENCORD_DIR --quiet
            Write-Preflight "Vencord source downloaded" "pass"
        } catch {
            Write-Preflight "Vencord source downloaded" "fail" "$_"
            exit 1
        }
    }
}

# 6. Integrate and Validate PixelsRPC Plugin Source
function Integrate-PixelsRpcPlugin {
    $userpluginsDir = Join-Path $VENCORD_DIR "src\userplugins"
    if (-not (Test-Path $userpluginsDir)) {
        New-Item -ItemType Directory -Path $userpluginsDir -Force | Out-Null
    }

    $targetPluginDir = Join-Path $userpluginsDir "pixelsrpc"
    if (-not (Test-Path $targetPluginDir)) {
        New-Item -ItemType Directory -Path $targetPluginDir -Force | Out-Null
    }
    $targetComponentsDir = Join-Path $targetPluginDir "components"
    if (-not (Test-Path $targetComponentsDir)) {
        New-Item -ItemType Directory -Path $targetComponentsDir -Force | Out-Null
    }

    # Candidate source locations
    $pluginCandidates = @(
        (Join-Path $PSScriptRoot "..\..\packages\vencord-plugin\dist\pixelsrpc"),
        (Join-Path $PSScriptRoot "..\..\packages\vencord-plugin\src"),
        (Join-Path $INSTALL_ROOT "plugin-cache"),
        "d:\mybuilds\pixalgg1\discord-rpc-platform\packages\vencord-plugin\dist\pixelsrpc",
        "d:\mybuilds\pixalgg1\discord-rpc-platform\packages\vencord-plugin\src"
    )

    $foundSource = $null
    foreach ($cand in $pluginCandidates) {
        if (Test-Path (Join-Path $cand "index.ts")) {
            $foundSource = $cand
            break
        }
    }

    if ($foundSource) {
        Copy-Item -Path "$foundSource\*" -Destination $targetPluginDir -Recurse -Force
    } else {
        # Remote download fallback from production web app or GitHub
        $baseUrl = "https://pixlpresence1-web.vercel.app/pixelsrpc-plugin"
        $fallbackUrl = "https://raw.githubusercontent.com/Rockybhaiff94/pixlpresence1/master/packages/vencord-plugin/src"
        $files = @(
            "index.ts",
            "settings.ts",
            "types.ts",
            "native.ts",
            "styles.css",
            "components/StatusCard.tsx",
            "components/ActionControls.tsx",
            "components/SettingsAbout.tsx"
        )
        foreach ($file in $files) {
            $dest = Join-Path $targetPluginDir $file.Replace("/", "\")
            $destDir = Split-Path $dest
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            try {
                Invoke-RestMethod -Uri "$baseUrl/$file" -OutFile $dest -TimeoutSec 10
            } catch {
                Invoke-RestMethod -Uri "$fallbackUrl/$file" -OutFile $dest -TimeoutSec 10
            }
        }
    }

    # Validate Plugin File Presence
    $requiredFiles = @(
        (Join-Path $targetPluginDir "index.ts"),
        (Join-Path $targetPluginDir "settings.ts"),
        (Join-Path $targetPluginDir "types.ts"),
        (Join-Path $targetComponentsDir "StatusCard.tsx"),
        (Join-Path $targetComponentsDir "ActionControls.tsx"),
        (Join-Path $targetComponentsDir "SettingsAbout.tsx")
    )
    foreach ($rf in $requiredFiles) {
        if (-not (Test-Path $rf)) {
            Write-Preflight "PixelsRPC source validated" "fail" "Missing required file: $(Split-Path $rf -Leaf)"
            exit 1
        }
    }
    Write-Preflight "PixelsRPC source validated" "pass"

    # Validate Plugin Imports against Vencord specifications
    $actionControlsContent = Get-Content (Join-Path $targetComponentsDir "ActionControls.tsx") -Raw
    $settingsAboutContent = Get-Content (Join-Path $targetComponentsDir "SettingsAbout.tsx") -Raw

    if ($actionControlsContent -match 'import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*["'']@webpack/common["'']' -or $actionControlsContent -match 'Button\.Sizes') {
        Write-Preflight "Plugin imports validated" "fail" "ActionControls.tsx contains invalid legacy @webpack/common Button import."
        exit 1
    }
    if ($settingsAboutContent -match 'import\s*\{[^}]*\bForms\b[^}]*\}\s*from\s*["'']@webpack/common["'']' -or $settingsAboutContent -match 'Forms\.') {
        Write-Preflight "Plugin imports validated" "fail" "SettingsAbout.tsx contains invalid legacy @webpack/common Forms import."
        exit 1
    }
    Write-Preflight "Plugin imports validated" "pass"

    # Whitelist PixelsRPC domains in Vencord Content Security Policy (CSP)
    $cspPath = Join-Path $VENCORD_DIR "src\main\csp\index.ts"
    if (Test-Path $cspPath) {
        $cspText = Get-Content $cspPath -Raw
        if ($cspText -notmatch "pixlpresence1-web\.vercel\.app") {
            $policySnippet = @'
    // PIXEL.GG & PixelsRPC endpoints (Web dashboard, API & assets)
    "pixlpresence1-web.vercel.app": ImageAndCssSrc,
    "pixelgg-api.onrender.com": ImageAndCssSrc,
    "*.pixel.gg": ImageAndCssSrc,
    "pixel.gg": ImageAndCssSrc,
};
'@
            $cspText = $cspText -replace '\};\s*$', $policySnippet
            Set-Content -Path $cspPath -Value $cspText -Encoding UTF8
            Write-Preflight "Vencord CSP whitelisted for PIXEL.GG" "pass"
        } else {
            Write-Preflight "Vencord CSP whitelisted for PIXEL.GG" "pass"
        }
    }
}

# 7. Install Dependencies and Build Vencord with PixelsRPC
function Build-VencordWithValidation {
    if ($SkipBuild) {
        Write-Preflight "Build completed (skipped via -SkipBuild)" "warn"
        return
    }

    Push-Location $VENCORD_DIR
    $buildStartTime = Get-Date

    try {
        # 1. Install Dependencies
        if ($script:PnpmRunner -eq "pnpm") {
            Invoke-NativeProcess "install Vencord dependencies" { pnpm install --silent }
        } else {
            Invoke-NativeProcess "install Vencord dependencies" { npx pnpm@12.15.0 install --silent }
        }
        Write-Preflight "Build dependencies installed" "pass"

        # 2. Compile Vencord
        if ($script:PnpmRunner -eq "pnpm") {
            Invoke-NativeProcess "compile Vencord" { pnpm build }
        } else {
            Invoke-NativeProcess "compile Vencord" { npx pnpm@12.15.0 build }
        }
        Write-Preflight "Build completed" "pass"

    } catch {
        Write-Preflight "Build completed" "fail" "$_"
        Pop-Location
        exit 1
    }

    # 3. Verify Artifacts
    $rendererPath = Join-Path $VENCORD_DIR "dist\renderer.js"
    $patcherPath = Join-Path $VENCORD_DIR "dist\patcher.js"

    if (-not (Test-Path $rendererPath) -or -not (Test-Path $patcherPath)) {
        Write-Preflight "Build artifacts verified" "fail" "Required build files (renderer.js, patcher.js) were not generated."
        Pop-Location
        exit 1
    }

    # Verify that PixelsRPC was compiled into renderer.js
    $rendererText = [System.IO.File]::ReadAllText($rendererPath)
    if (-not $rendererText.Contains("PixelsRPC Connection") -and -not $rendererText.Contains("pixelsrpc")) {
        Write-Preflight "Build artifacts verified" "fail" "Compiled renderer.js does not contain PixelsRPC plugin code."
        Pop-Location
        exit 1
    }

    Write-Preflight "Build artifacts verified" "pass"
    Pop-Location
}

# 8. Create and Verify Backup
function Backup-DiscordInstallation([PSCustomObject]$Target) {
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDest = Join-Path $BACKUP_DIR "$($Target.Branch)-$timestamp"
    New-Item -ItemType Directory -Path $backupDest -Force | Out-Null

    $resourcesDir = Join-Path $Target.AppPath "resources"
    if (-not (Test-Path $resourcesDir)) {
        Write-Preflight "Backup verified" "fail" "Discord resources directory not found at $resourcesDir."
        exit 1
    }

    # Copy all resources to backup
    Copy-Item -Path "$resourcesDir\*" -Destination $backupDest -Recurse -Force
    $backupFiles = Get-ChildItem -Path $backupDest
    if ($backupFiles.Count -eq 0) {
        Write-Preflight "Backup verified" "fail" "Backup directory is empty."
        exit 1
    }

    $script:CurrentBackupPath = $backupDest
    Write-Preflight "Backup verified ($backupDest)" "pass"
}

# 9. Rollback Helper
function Rollback-Discord([PSCustomObject]$Target, [string]$BackupPath) {
    if (-not $BackupPath -or -not (Test-Path $BackupPath)) {
        Write-Warn "No active backup path to restore from."
        return
    }

    Write-Warn "Rolling back Discord installation from $BackupPath..."
    $resourcesDir = Join-Path $Target.AppPath "resources"
    try {
        Copy-Item -Path "$BackupPath\*" -Destination $resourcesDir -Recurse -Force
        Write-Success "Discord installation restored to clean state from backup."
    } catch {
        Write-Err "Rollback encountered an error: $_"
    }
}

# 10. Inject Vencord Using Supported Installer CLI
function Patch-DiscordInstallation([PSCustomObject]$Target) {
    Write-Step "Preparing to patch $($Target.Name)..."

    # Close Discord processes before file operations
    $processes = Get-Process -Name "Discord*", "DiscordCanary*", "DiscordPTB*" -ErrorAction SilentlyContinue
    if ($processes.Count -gt 0) {
        Write-Warn "Closing running Discord processes..."
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Ensure official installer CLI binary is present
    $installerCli = Join-Path $VENCORD_DIR "dist\Installer\VencordInstallerCli.exe"
    if (-not (Test-Path $installerCli)) {
        Write-Step "Downloading official VencordInstallerCli..."
        Push-Location $VENCORD_DIR
        try {
            node scripts/runInstaller.mjs -- --help | Out-Null
        } finally {
            Pop-Location
        }
    }

    if (-not (Test-Path $installerCli)) {
        Write-Preflight "Installation verified" "fail" "VencordInstallerCli.exe was not downloaded."
        exit 1
    }

    # Execute injection with custom VENCORD_USER_DATA_DIR
    Push-Location $VENCORD_DIR
    try {
        $env:VENCORD_USER_DATA_DIR = $VENCORD_DIR
        & $installerCli -install -branch $($Target.Branch)
        $patchExit = $LASTEXITCODE
        if ($patchExit -ne 0) {
            throw "VencordInstallerCli failed with exit code $patchExit."
        }
    } catch {
        Write-Preflight "Installation verified" "fail" "$_"
        Rollback-Discord $Target $script:CurrentBackupPath
        Pop-Location
        exit 1
    } finally {
        Pop-Location
    }

    # Independently verify that app.asar was patched
    $appAsar = Join-Path $Target.AppPath "resources\app.asar"
    if (-not (Test-Path $appAsar)) {
        Write-Preflight "Installation verified" "fail" "Target app.asar not found after patching."
        Rollback-Discord $Target $script:CurrentBackupPath
        exit 1
    }

    # Verify that app.asar contains stub pointing to Vencord patcher
    try {
        $asarBytes = [System.IO.File]::ReadAllBytes($appAsar)
        $asarText = [System.Text.Encoding]::UTF8.GetString($asarBytes)
        if (-not $asarText.Contains("patcher.js")) {
            Write-Preflight "Installation verified" "fail" "app.asar does not contain Vencord patcher reference."
            Rollback-Discord $Target $script:CurrentBackupPath
            exit 1
        }
    } catch {
        Write-Preflight "Installation verified" "fail" "Could not read patched app.asar: $_"
        Rollback-Discord $Target $script:CurrentBackupPath
        exit 1
    }

    Write-Preflight "Installation verified" "pass"
}

# 11. Setup Global CLI Command in PATH (Safe Self-Copy)
function Setup-CliEnvironment {
    if (-not (Test-Path $BIN_DIR)) {
        New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null
    }

    $installedScript = Join-Path $BIN_DIR "pixelsrpc.ps1"
    $installedCmd = Join-Path $BIN_DIR "pixelsrpc.cmd"

    # Compare normalized paths to prevent overwriting item with itself
    if ($PSCommandPath) {
        $srcPath = [System.IO.Path]::GetFullPath($PSCommandPath)
        $destPath = [System.IO.Path]::GetFullPath($installedScript)

        if (-not [string]::Equals($srcPath, $destPath, [System.StringComparison]::OrdinalIgnoreCase)) {
            Copy-Item -Path $srcPath -Destination $destPath -Force
        }
    }

    # Create cmd shim
    $cmdContent = "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0pixelsrpc.ps1`" %*"
    Set-Content -Path $installedCmd -Value $cmdContent -Force

    # Ensure $BIN_DIR is in user PATH
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$BIN_DIR*") {
        [System.Environment]::SetEnvironmentVariable("Path", "$userPath;$BIN_DIR", "User")
        $env:Path = "$env:Path;$BIN_DIR"
    }

    Write-Preflight "CLI environment configured" "pass"
}

# 12. Master Preflight & Install Execution
function Execute-Install {
    Write-BrandedHeader
    Write-Host "PIXELS RPC PREFLIGHT VALIDATION" -ForegroundColor Cyan
    Write-Host "-------------------------------" -ForegroundColor DarkGray

    Assert-WindowsCompatibility
    Assert-BuildPrerequisites
    Sync-VencordSource
    Assert-PnpmVersionManagement
    Integrate-PixelsRpcPlugin
    Build-VencordWithValidation

    # Select Discord Target
    $discords = Get-DiscordInstallations
    if ($discords.Count -eq 0) {
        Write-Preflight "Discord detection" "fail" "No supported Discord installation found on your system."
        exit 1
    }

    $target = $null
    if ($DiscordBranch -ne "auto") {
        $match = $discords | Where-Object { $_.Branch -eq $DiscordBranch }
        if ($match) { $target = $match }
    }

    if (-not $target) {
        if ($discords.Count -eq 1 -or $NoPrompt) {
            $target = $discords[0]
        } else {
            Write-Host "`nMultiple Discord clients detected. Please select target:" -ForegroundColor Cyan
            for ($i = 0; $i -lt $discords.Count; $i++) {
                Write-Host "  [$i] $($discords[$i].Name) ($($discords[$i].Version))" -ForegroundColor White
            }
            $choice = Read-Host "Select client [0-$($discords.Count - 1)] (Default: 0)"
            if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "0" }
            if ($choice -match '^\d+$' -and [int]$choice -lt $discords.Count) {
                $target = $discords[[int]$choice]
            } else {
                $target = $discords[0]
            }
        }
    }

    $script:TargetDiscordClient = $target
    Write-Step "Targeting $($target.Name) (version $($target.Version))..."

    Backup-DiscordInstallation $target
    Patch-DiscordInstallation $target
    Setup-CliEnvironment

    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "   PIXEL.GG PIXELSRPC VENCORD PLUGIN INSTALLED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEPS TO LINK YOUR ACCOUNT:" -ForegroundColor Cyan
    Write-Host "  1. Start Discord ($($target.Name))." -ForegroundColor White
    Write-Host "  2. Go to: Settings -> Vencord -> Plugins." -ForegroundColor White
    Write-Host "  3. Find 'PixelsRPC' and toggle it ON (disabled by default)." -ForegroundColor White
    Write-Host "  4. Click 'Link Account'." -ForegroundColor White
    Write-Host "  5. Go to https://pixlpresence1-web.vercel.app/account/rpc in your browser." -ForegroundColor White
    Write-Host "  6. Generate your 2-minute linking code and enter it into Discord!" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now use 'pixelsrpc' anywhere in your terminal:" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc status    - Check Discord & Vencord status" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc repair    - Re-patch Discord after a Discord update" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc rollback  - Restore Discord from previous backup" -ForegroundColor DarkGray
    Write-Host "  pixelsrpc uninstall - Restore stock unpatched Discord" -ForegroundColor DarkGray
    Write-Host ""
}

# 13. Status Command
function Show-Status {
    Write-BrandedHeader
    Write-Host "PixelsRPC System Diagnostic Status:" -ForegroundColor Cyan
    Write-Host "----------------------------------" -ForegroundColor DarkGray

    $discords = Get-DiscordInstallations
    if ($discords.Count -eq 0) {
        Write-Warn "Discord: Not Detected"
    } else {
        foreach ($d in $discords) {
            $appAsar = Join-Path $d.AppPath "resources\app.asar"
            $isPatched = $false
            if (Test-Path $appAsar) {
                try {
                    $txt = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($appAsar))
                    $isPatched = $txt.Contains("patcher.js")
                } catch { }
            }
            $statusText = if ($isPatched) { "Vencord Patched [Active]" } else { "Unpatched / Stock" }
            Write-Host "Discord Client : $($d.Name) ($($d.Version)) — $statusText" -ForegroundColor White
        }
    }

    $hasVencord = Test-Path (Join-Path $VENCORD_DIR "dist\renderer.js")
    Write-Host "Vencord Build  : $(if ($hasVencord) { 'Built & Ready (dist/renderer.js)' } else { 'Not Built' })" -ForegroundColor White

    $hasPlugin = Test-Path (Join-Path $VENCORD_DIR "src\userplugins\pixelsrpc\index.ts")
    Write-Host "PixelsRPC Plugin: $(if ($hasPlugin) { 'Installed in userplugins' } else { 'Not Found' })" -ForegroundColor White
    Write-Host "CLI Version    : $PIXEL_VERSION" -ForegroundColor White
    Write-Host ""
}

# 14. Repair Command
function Repair-PixelsRpc {
    Write-BrandedHeader
    Write-Step "Repairing Vencord injection after Discord update..."

    $discords = Get-DiscordInstallations
    if ($discords.Count -eq 0) {
        Write-Err "No Discord client detected to repair."
        exit 1
    }

    $target = $discords[0]
    if ($DiscordBranch -ne "auto") {
        $match = $discords | Where-Object { $_.Branch -eq $DiscordBranch }
        if ($match) { $target = $match }
    }

    $installerCli = Join-Path $VENCORD_DIR "dist\Installer\VencordInstallerCli.exe"
    if (-not (Test-Path $installerCli) -or -not (Test-Path (Join-Path $VENCORD_DIR "dist\renderer.js"))) {
        Write-Warn "Vencord build missing or incomplete. Running full installation..."
        Execute-Install
        return
    }

    # Backup then repair
    Backup-DiscordInstallation $target
    Push-Location $VENCORD_DIR
    try {
        $env:VENCORD_USER_DATA_DIR = $VENCORD_DIR
        & $installerCli -repair -branch $($target.Branch)
        if ($LASTEXITCODE -ne 0) {
            & $installerCli -install -branch $($target.Branch)
        }
        Write-Success "Repaired Vencord injection for $($target.Name)!"
    } finally {
        Pop-Location
    }
}

# 15. Rollback Command
function Execute-Rollback {
    Write-BrandedHeader
    Write-Step "Searching for previous Discord backups..."

    if (-not (Test-Path $BACKUP_DIR)) {
        Write-Err "No backups found in $BACKUP_DIR."
        exit 1
    }

    $backups = Get-ChildItem -Path $BACKUP_DIR -Directory | Sort-Object Name -Descending
    if ($backups.Count -eq 0) {
        Write-Err "No backups available to restore."
        exit 1
    }

    $discords = Get-DiscordInstallations
    if ($discords.Count -eq 0) {
        Write-Err "No Discord installation detected."
        exit 1
    }
    $target = $discords[0]

    Write-Host "Available Backups:" -ForegroundColor Cyan
    for ($i = 0; $i -lt [Math]::Min(5, $backups.Count); $i++) {
        Write-Host "  [$i] $($backups[$i].Name)" -ForegroundColor White
    }

    $selectedBackup = $backups[0]
    Write-Step "Restoring $($target.Name) from latest backup: $($selectedBackup.Name)..."
    Rollback-Discord $target $selectedBackup.FullName
}

# 16. Uninstall Command
function Uninstall-PixelsRpc {
    Write-BrandedHeader
    Write-Step "Uninstalling Vencord and restoring stock Discord..."

    $processes = Get-Process -Name "Discord*", "DiscordCanary*", "DiscordPTB*" -ErrorAction SilentlyContinue
    if ($processes.Count -gt 0) {
        Write-Warn "Closing Discord..."
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    $discords = Get-DiscordInstallations
    foreach ($d in $discords) {
        $installerCli = Join-Path $VENCORD_DIR "dist\Installer\VencordInstallerCli.exe"
        if (Test-Path $installerCli) {
            Push-Location $VENCORD_DIR
            try {
                $env:VENCORD_USER_DATA_DIR = $VENCORD_DIR
                & $installerCli -uninstall -branch $($d.Branch)
            } catch { } finally {
                Pop-Location
            }
        }

        # Verify stock app.asar restored
        $asar = Join-Path $d.AppPath "resources\app.asar"
        $origAsar = Join-Path $d.AppPath "resources\_app.asar"
        if (Test-Path $origAsar) {
            if (Test-Path $asar) { Remove-Item $asar -Force }
            Move-Item $origAsar $asar -Force
            Write-Success "Restored stock app.asar for $($d.Name)."
        }
    }

    Write-Success "Discord has been restored to default stock state."
    Write-Host "Your PIXEL.GG cloud settings and custom presence remain safe in the web studio." -ForegroundColor DarkGray
}

# Entrypoint Switch
switch ($Command.ToLower()) {
    "install"   { Execute-Install }
    "update"    { Execute-Install }
    "repair"    { Repair-PixelsRpc }
    "rollback"  { Execute-Rollback }
    "uninstall" { Uninstall-PixelsRpc }
    "status"    { Show-Status }
    "version"   { Write-Host "PixelsRPC CLI v$PIXEL_VERSION" -ForegroundColor Green }
    "help"      {
        Write-BrandedHeader
        Write-Host "Usage: pixelsrpc [install|update|repair|rollback|uninstall|status|version]" -ForegroundColor White
    }
    default     { Execute-Install }
}
