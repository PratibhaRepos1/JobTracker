# Launches backend (FastAPI on :8000) and frontend (Vite on :5173) in parallel.
# Usage: .\start.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$backend = Start-Process -PassThru -NoNewWindow -FilePath "powershell" -ArgumentList @(
    "-NoProfile", "-Command",
    "Set-Location '$root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
)

$frontend = Start-Process -PassThru -NoNewWindow -FilePath "powershell" -ArgumentList @(
    "-NoProfile", "-Command",
    "Set-Location '$root\frontend'; npm run dev"
)

Write-Host "Backend  PID $($backend.Id) on http://localhost:8000"
Write-Host "Frontend PID $($frontend.Id) on http://localhost:5173"
Write-Host "Press Ctrl+C to stop both."

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    Stop-Process -Id $backend.Id, $frontend.Id -Force -ErrorAction SilentlyContinue
}
