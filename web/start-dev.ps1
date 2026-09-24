$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== Step 1: Kill existing node processes ==="
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Done."

Write-Host ""
Write-Host "=== Step 2: Verify .next is gone ==="
$webDir = $PSScriptRoot
if (Test-Path "$webDir\.next") {
    Write-Host "WARNING: .next still exists, removing..."
    Remove-Item "$webDir\.next" -Recurse -Force
}
if (Test-Path "$webDir\.next") {
    Write-Host "ERROR: .next still present after removal"
} else {
    Write-Host "CONFIRMED: .next is gone"
}

Write-Host ""
Write-Host "=== Step 3: Start dev server ==="
Set-Location $webDir
$env:NODE_ENV = "development"
$env:NEXT_TURBOPACK = "1"
$proc = Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--port", "3000" -WorkingDirectory $webDir -WindowStyle Hidden -PassThru
Write-Host "Started PID: $($proc.Id)"

Write-Host ""
Write-Host "=== Step 4: Wait for server readiness (poll up to 60s) ==="
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -lt 500) {
            $ready = $true
            Write-Host "Server ready after $($i * 2)s (HTTP $($resp.StatusCode))"
            break
        }
    } catch {
        # Server not ready yet
    }
    Write-Host "... ($($i * 2)s)"
}

if (-not $ready) {
    Write-Host "WARNING: Server did not become ready"
    exit 1
}

Write-Host ""
Write-Host "=== Step 5: Test key routes ==="
$routes = @(
    "/", "/about", "/register", "/login",
    "/community", "/events", "/insights"
)
$fails = @()
foreach ($route in $routes) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000$route" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -ge 400) {
            $fails += "$route -> $($resp.StatusCode)"
            Write-Host "FAIL  $route -> $($resp.StatusCode)"
        } else {
            Write-Host "OK    $route -> $($resp.StatusCode)"
        }
    } catch {
        $fails += "$route -> $($_.Exception.Message.Substring(0, [Math]::Min(60, $_.Exception.Message.Length)))"
        Write-Host "ERR   $route -> $($_.Exception.Message.Substring(0, [Math]::Min(60, $_.Exception.Message.Length)))"
    }
}

Write-Host ""
if ($fails.Count -gt 0) {
    Write-Host "FAILED ROUTES:" -ForegroundColor Red
    foreach ($f in $fails) { Write-Host "  $f" -ForegroundColor Red }
} else {
    Write-Host "All $($routes.Count) routes OK!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Dev server running at http://localhost:3000 (PID $($proc.Id))"
Write-Host "To stop: taskkill /F /PID $($proc.Id)"
