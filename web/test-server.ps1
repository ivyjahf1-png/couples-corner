# test-server.ps1 — verify the dev server is responding
$ErrorActionPreference = "SilentlyContinue"

$urls = @(
    "/",
    "/about",
    "/register",
    "/login",
    "/community",
    "/events",
    "/insights",
    "/admin",
    "/chat",
    "/settings",
    "/dashboard",
    "/feed",
    "/matches",
    "/messages",
    "/onboarding",
    "/profile",
    "/subscription",
    "/contact",
    "/how-it-works",
    "/safety",
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies"
)

$fails = @()
$oks = 0

foreach ($url in $urls) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000$url" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -ge 400) {
            $fails += "$url -> $($r.StatusCode)"
            Write-Host "FAIL  $url -> $($r.StatusCode)" -ForegroundColor Red
        } else {
            $oks++
            Write-Host "OK    $url -> $($r.StatusCode)"
        }
    } catch {
        $msg = $_.Exception.Message
        $short = if ($msg.Length -gt 70) { $msg.Substring(0, 70) + "..." } else { $msg }
        $fails += "$url -> $short"
        Write-Host "ERR   $url -> $short" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "  Results: $oks OK, $($fails.Count) failures"
Write-Host "============================================"

if ($fails.Count -gt 0) {
    Write-Host "Failures:" -ForegroundColor Red
    foreach ($f in $fails) {
        Write-Host "  $f" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host "All routes responding successfully!" -ForegroundColor Green
    exit 0
}
