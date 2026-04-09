@echo off
:: Song Vault - Windows Setup Launcher
:: Double-click this file to set up everything automatically.
:: No need to change any PowerShell settings.

title Song Vault Setup

echo.
echo ============================================
echo   Song Vault Setup - starting...
echo ============================================
echo.

:: Check if PowerShell is available
where powershell >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell not found. Please install it from:
    echo https://aka.ms/powershell
    pause
    exit /b 1
)

:: Run the setup script with execution policy bypassed
:: The -File path is relative to this bat file's location
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0scripts\setup-windows.ps1"

if errorlevel 1 (
    echo.
    echo Setup encountered an error. See messages above.
    pause
    exit /b 1
)
