# RealtorNet Web Secret Scanning Setup
# Run this ONCE after a fresh clone.

Write-Host "=== RealtorNet Web Secret Scanning Setup ===" -ForegroundColor Cyan

Write-Host "[1/5] detect-secrets..." -ForegroundColor Yellow
try { & detect-secrets --version } catch { pip install detect-secrets }

Write-Host "[2/5] gitleaks..." -ForegroundColor Yellow
try {
    & gitleaks version
} catch {
    Write-Host "  Install gitleaks from: https://github.com/gitleaks/gitleaks/releases" -ForegroundColor Yellow
}

Write-Host "[3/5] Installing pre-commit hooks..." -ForegroundColor Yellow
try { & pre-commit install } catch { pip install pre-commit; & pre-commit install }

Write-Host "[4/5] Regenerating .secrets.baseline..." -ForegroundColor Yellow
try {
    Remove-Item -Force .secrets.baseline -ErrorAction SilentlyContinue
    & detect-secrets scan --all-files --baseline .secrets.baseline
} catch {
    Write-Host "  Run: detect-secrets scan --all-files --baseline .secrets.baseline" -ForegroundColor Yellow
}

Write-Host "[5/5] Verification..." -ForegroundColor Yellow
if (Test-Path .git/hooks/pre-commit) {
    Write-Host "  Pre-commit hook IS ACTIVE" -ForegroundColor Green
} else {
    Write-Host "  Run: pre-commit install" -ForegroundColor Yellow
}

Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
