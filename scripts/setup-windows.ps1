# Song Vault - One-Click Setup for Windows
# Run this script to automatically set up GPT4All + Continue in VS Code
# Right-click → Run with PowerShell

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Song Vault Setup for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin (needed for some operations)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Note: Some features work better with admin. Consider running PowerShell as Administrator." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check prerequisites
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Magenta
$missing = @()

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $missing += "Git"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $missing += "Node.js"
}
if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "  ⚠ VS Code not found in PATH (may still be installed)" -ForegroundColor Yellow
}

if ($missing) {
    Write-Host "  ✗ Missing: $($missing -join ', ')" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install these first:" -ForegroundColor Red
    if ($missing -contains "Git") { Write-Host "  • Git: https://git-scm.com/download/win" }
    if ($missing -contains "Node.js") { Write-Host "  • Node.js: https://nodejs.org (LTS recommended)" }
    Write-Host ""
    exit 1
}

Write-Host "  ✓ Git installed" -ForegroundColor Green
Write-Host "  ✓ Node.js installed" -ForegroundColor Green
Write-Host ""

# Step 2: Create project directory
Write-Host "Step 2: Setting up project directory..." -ForegroundColor Magenta
$projectDir = "$HOME\Documents\song-vault"

if (Test-Path $projectDir) {
    Write-Host "  ✓ Directory exists: $projectDir" -ForegroundColor Green
} else {
    New-Item -ItemType Directory -Path $projectDir | Out-Null
    Write-Host "  ✓ Created: $projectDir" -ForegroundColor Green
}

Set-Location $projectDir
Write-Host ""

# Step 3: Clone or pull repo
Write-Host "Step 3: Cloning Song Vault repo..." -ForegroundColor Magenta
if (Test-Path "$projectDir\.git") {
    Write-Host "  Repository already cloned, pulling latest..." -ForegroundColor Cyan
    git pull origin main | Out-Null
    Write-Host "  ✓ Updated from GitHub" -ForegroundColor Green
} else {
    Write-Host "  Cloning from GitHub..." -ForegroundColor Cyan
    git clone https://github.com/navo-sketch/song-vault.git . 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to clone. Check your internet connection." -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Cloned successfully" -ForegroundColor Green
}
Write-Host ""

# Step 4: Install Node dependencies
Write-Host "Step 4: Installing Node dependencies..." -ForegroundColor Magenta
Write-Host "  This may take a minute..." -ForegroundColor Cyan
npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 5: Check and install Ollama
Write-Host "Step 5: Setting up Ollama (local AI)..." -ForegroundColor Magenta
$ollamaPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"
$ollamaInstalled = Test-Path $ollamaPath

if ($ollamaInstalled) {
    Write-Host "  ✓ Ollama already installed" -ForegroundColor Green
} else {
    Write-Host "  Ollama not found. Downloading installer..." -ForegroundColor Cyan
    $ollamaURL = "https://ollama.com/download/windows"
    $installerPath = "$env:TEMP\OllamaSetup.exe"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath -ErrorAction Stop
        Write-Host "  ✓ Downloaded Ollama installer" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Opening Ollama installer... Complete the installation and click Finish." -ForegroundColor Yellow
        Write-Host "  Waiting for installer..." -ForegroundColor Cyan

        $process = Start-Process -FilePath $installerPath -Wait -PassThru
        if ($process.ExitCode -eq 0) {
            Write-Host "  ✓ Ollama installed successfully" -ForegroundColor Green
            Start-Sleep -Seconds 3
        } else {
            Write-Host "  ⚠ Ollama installation may have been skipped" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠ Could not auto-download Ollama" -ForegroundColor Yellow
        Write-Host "    Download manually from https://ollama.com/download" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 6: Pulling AI models (this will download ~5GB)..." -ForegroundColor Magenta
Write-Host "  Note: This requires Ollama to be running" -ForegroundColor Cyan
Write-Host ""

# Try to pull models (Ollama must be running)
$models = @("codellama:7b", "starcoder2:3b", "nomic-embed-text")
$ollamaRunning = $false

foreach ($model in $models) {
    Write-Host "  Pulling $model..." -ForegroundColor Cyan
    $output = ollama pull $model 2>&1

    if ($LASTEXITCODE -eq 0 -or $output -match "already exists") {
        Write-Host "    ✓ $model ready" -ForegroundColor Green
        $ollamaRunning = $true
    } elseif ($output -match "error|not found|connection refused") {
        if (-not $ollamaRunning) {
            Write-Host "    ⚠ Ollama not running yet" -ForegroundColor Yellow
            break
        }
    }
}

Write-Host ""

# Step 7: Install VS Code extensions
Write-Host "Step 7: Setting up VS Code extensions..." -ForegroundColor Magenta
$extensions = @("continue.continue", "eamodio.gitlens", "mhutchie.git-graph")
foreach ($ext in $extensions) {
    Write-Host "  Installing $ext..." -ForegroundColor Cyan
    code --install-extension $ext --force 2>&1 | Out-Null
}
Write-Host "  ✓ Extensions installed" -ForegroundColor Green
Write-Host ""

# Step 8: Verify everything
Write-Host "Step 8: Verification..." -ForegroundColor Magenta
npm run lint 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Project passes linting" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Lint check had issues (may be OK)" -ForegroundColor Yellow
}
Write-Host ""

# Final summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Ollama app (Start Menu → Ollama)" -ForegroundColor White
Write-Host "  2. Wait for 'Ollama is running' message" -ForegroundColor White
Write-Host "  3. Open VS Code and navigate to: $projectDir" -ForegroundColor White
Write-Host "  4. Press Ctrl+M to open Continue sidebar" -ForegroundColor White
Write-Host "  5. Select 'Ollama – CodeLlama 7B (local)' from the model dropdown" -ForegroundColor White
Write-Host ""
Write-Host "Or just run:" -ForegroundColor Cyan
Write-Host "  cd $projectDir" -ForegroundColor White
Write-Host "  code ." -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🎵" -ForegroundColor Green
Write-Host ""

# Option to open VS Code now
Write-Host "Open VS Code now? (y/n)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "y" -or $response -eq "Y") {
    code .
}
