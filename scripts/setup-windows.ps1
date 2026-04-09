# Song Vault - Windows Setup Script
# Launched via setup-windows.bat (do not run directly)

Set-StrictMode -Off

$projectDir = "$HOME\Documents\song-vault"
$ollamaExe  = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

function Step($n, $msg) { Write-Host "" ; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function OK($msg)        { Write-Host "    OK  $msg" -ForegroundColor Green }
function WARN($msg)      { Write-Host "    --  $msg" -ForegroundColor Yellow }
function FAIL($msg)      { Write-Host "    !!  $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Song Vault — Windows Setup"               -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
Step 1 "Checking prerequisites"

$gitOk  = $null -ne (Get-Command git  -ErrorAction SilentlyContinue)
$nodeOk = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
$codeOk = $null -ne (Get-Command code -ErrorAction SilentlyContinue)

if ($gitOk)  { OK "Git found" }     else { FAIL "Git not found — install from https://git-scm.com/download/win then re-run" }
if ($nodeOk) { OK "Node.js found" } else { FAIL "Node.js not found — install from https://nodejs.org (LTS) then re-run" }
if ($codeOk) { OK "VS Code found" } else { WARN "VS Code not found in PATH — extensions will be skipped" }

if (-not $gitOk -or -not $nodeOk) {
    Write-Host ""
    Write-Host "Install the missing tools above, then run setup-windows.bat again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ── 2. Project directory ──────────────────────────────────────────────────────
Step 2 "Project directory: $projectDir"

if (-not (Test-Path $projectDir)) {
    New-Item -ItemType Directory -Path $projectDir -Force | Out-Null
    OK "Created $projectDir"
} else {
    OK "Directory already exists"
}

Set-Location $projectDir

# ── 3. Clone / update repo ────────────────────────────────────────────────────
Step 3 "Cloning Song Vault from GitHub"

if (Test-Path "$projectDir\.git") {
    WARN "Repo already cloned — pulling latest changes"
    & git pull origin main 2>&1 | Out-Null
    OK "Up to date"
} else {
    Write-Host "    Cloning (this takes a moment)..." -ForegroundColor White
    $cloneOut = & git clone https://github.com/navo-sketch/song-vault.git . 2>&1
    if ($LASTEXITCODE -ne 0) {
        FAIL "Clone failed: $cloneOut"
        FAIL "Check your internet connection and try again."
        Read-Host "Press Enter to exit"
        exit 1
    }
    OK "Cloned successfully"
}

# ── 4. Node dependencies ──────────────────────────────────────────────────────
Step 4 "Installing Node dependencies (npm install)"

Write-Host "    Running npm install..." -ForegroundColor White
& cmd /c "npm install 2>&1"
if ($LASTEXITCODE -ne 0) {
    WARN "npm install reported issues — continuing anyway"
} else {
    OK "Dependencies ready"
}

# ── 5. Ollama ─────────────────────────────────────────────────────────────────
Step 5 "Ollama (local AI runtime)"

if (Test-Path $ollamaExe) {
    OK "Ollama already installed at $ollamaExe"
} else {
    Write-Host "    Downloading Ollama installer..." -ForegroundColor White
    $installerPath = "$env:TEMP\OllamaSetup.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath -UseBasicParsing
        OK "Downloaded"
        Write-Host ""
        Write-Host "    The Ollama installer will open now." -ForegroundColor Yellow
        Write-Host "    Click through it and then come back here." -ForegroundColor Yellow
        Write-Host ""
        $proc = Start-Process -FilePath $installerPath -Wait -PassThru
        if ($proc.ExitCode -eq 0) {
            OK "Ollama installed"
            # Reload PATH so ollama is found in this session
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else {
            WARN "Installer exited with code $($proc.ExitCode) — may still be OK"
        }
    } catch {
        WARN "Could not auto-download Ollama: $_"
        WARN "Download manually: https://ollama.com/download"
    }
}

# Reload PATH in case Ollama was just installed
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# ── 6. AI models ──────────────────────────────────────────────────────────────
Step 6 "Pulling AI models (~5 GB total — may take several minutes)"

$ollamaCmd = $null
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    $ollamaCmd = "ollama"
} elseif (Test-Path $ollamaExe) {
    $ollamaCmd = $ollamaExe
}

if ($null -eq $ollamaCmd) {
    WARN "Ollama not found in PATH — skipping model downloads"
    WARN "After Ollama is installed, open a new terminal and run:"
    WARN "  ollama pull codellama:7b"
    WARN "  ollama pull starcoder2:3b"
    WARN "  ollama pull nomic-embed-text"
} else {
    # Start Ollama serve in background if not already running
    $ollamaRunning = $false
    try {
        $testResp = Invoke-WebRequest -Uri "http://localhost:11434" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($testResp.StatusCode -eq 200) { $ollamaRunning = $true }
    } catch { }

    if (-not $ollamaRunning) {
        Write-Host "    Starting Ollama server..." -ForegroundColor White
        Start-Process -FilePath $ollamaCmd -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 4
    }

    foreach ($model in @("codellama:7b", "starcoder2:3b", "nomic-embed-text")) {
        Write-Host "    Pulling $model..." -ForegroundColor White
        & $ollamaCmd pull $model 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        if ($LASTEXITCODE -eq 0) { OK "$model ready" } else { WARN "$model pull had issues — retry later with: ollama pull $model" }
    }
}

# ── 7. VS Code extensions ─────────────────────────────────────────────────────
Step 7 "Installing VS Code extensions"

if ($codeOk) {
    foreach ($ext in @("continue.continue", "eamodio.gitlens", "mhutchie.git-graph")) {
        Write-Host "    Installing $ext..." -ForegroundColor White
        & code --install-extension $ext --force 2>&1 | Out-Null
        OK $ext
    }
} else {
    WARN "VS Code not in PATH — open VS Code manually and install:"
    WARN "  Continue (continue.continue)"
    WARN "  GitLens (eamodio.gitlens)"
}

# ── 8. Verify build ───────────────────────────────────────────────────────────
Step 8 "Verifying project"

Set-Location $projectDir
$lintOut = & cmd /c "npm run lint 2>&1"
if ($LASTEXITCODE -eq 0) { OK "Lint passed" } else { WARN "Lint had warnings (non-fatal)" }

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup complete!"                           -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "What to do next:" -ForegroundColor Cyan
Write-Host "  1. Open Ollama from the Start Menu (keep it running in the tray)" -ForegroundColor White
Write-Host "  2. Open VS Code:  code $projectDir" -ForegroundColor White
Write-Host "  3. Press Ctrl+M to open the Continue AI sidebar" -ForegroundColor White
Write-Host "  4. Pick 'Ollama - CodeLlama 7B (local)' from the model dropdown" -ForegroundColor White
Write-Host ""

$open = Read-Host "Open VS Code now? (y/n)"
if ($open -match "^[Yy]") {
    Set-Location $projectDir
    & code .
}

Write-Host ""
Read-Host "Press Enter to close"
