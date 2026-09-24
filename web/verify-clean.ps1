$ErrorActionPreference = "SilentlyContinue"

$web = $PSScriptRoot

function WriteStatus($label, $value, $color = "White") {
    Write-Host "$label : $value" -ForegroundColor $color
}

Write-Host "============================================"
Write-Host "  VERIFICATION: All 4 Requirements"
Write-Host "============================================"
Write-Host ""

Write-Host "1. ROUTE CONCORDANCE (no duplicate routes)"
Write-Host "-------------------------------------------"
$shadows = @(
    "app\(public)\page.tsx",
    "app\(auth)\register\page.tsx",
    "app\(auth)\login\page.tsx"
)
$allClean = $true
foreach ($s in $shadows) {
    $fp = Join-Path $web $s
    if (Test-Path $fp) {
        WriteStatus "  $s" "EXISTS (conflict!)" "Red"
        $allClean = $false
    } else {
        WriteStatus "  $s" "REMOVED (clean)"
    }
}
$appPages = Get-ChildItem "$web\app" -Filter "page.tsx" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\(public\\)" -and $_.FullName -notmatch "\\(auth\\)" } |
    ForEach-Object { $_.FullName.Replace("$web\", "") }
WriteStatus "  Active page files" "$($appPages.Count)"
Write-Host ""

Write-Host "2. BUILD CACHE (.next)"
Write-Host "-------------------------------------------"
$nextDir = Join-Path $web ".next"
if (Test-Path $nextDir) {
    $routesDts = Join-Path $nextDir "dev\types\routes.d.ts"
    if (Test-Path $routesDts) {
        WriteStatus ".next/dev/types/routes.d.ts" "EXISTS (fresh build OK)" "Green"
        $info = Get-Item $nextDir
        WriteStatus "  LastWrite" "$($info.LastWriteTime)"
    } else {
        WriteStatus ".next/dev/types/routes.d.ts" "MISSING (build incomplete)" "Yellow"
    }
} else {
    WriteStatus ".next" "ABSENT (needs fresh build)" "Yellow"
}
Write-Host ""

Write-Host "3. MIDDLEWARE FILE"
Write-Host "-------------------------------------------"
$middleware = Join-Path $web "middleware.ts"
if (Test-Path $middleware) {
    WriteStatus "middleware.ts" "PRESENT (correct)" "Green"
} else {
    WriteStatus "middleware.ts" "MISSING" "Red"
}
$proxyTs = Join-Path $web "proxy.ts"
if (Test-Path $proxyTs) {
    WriteStatus "proxy.ts" "EXISTS (should be middleware.ts!)" "Yellow"
} else {
    WriteStatus "proxy.ts" "ABSENT (good)"
}
Write-Host ""

Write-Host "4. ROUTE CONFLICT SUMMARY"
Write-Host "-------------------------------------------"
$uniqueRoutes = @{}
foreach ($p in $appPages) {
    $rel = $p.Replace("$web\app\", "")
    $parts = $rel.Split('\')
    $cleanParts = @()
    foreach ($part in $parts) {
        if ($part -notmatch "^\(.*\)$") { $cleanParts += $part }
    }
    if ($cleanParts.Count -eq 0) { $cleanParts += "" }
    $url = "/" + ($cleanParts -join "/")
    if ($uniqueRoutes.ContainsKey($url)) {
        $uniqueRoutes[$url] += @($p)
    } else {
        $uniqueRoutes[$url] = @($p)
    }
}
$conflicts = $uniqueRoutes.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }
if ($conflicts.Count -eq 0) {
    WriteStatus "  Duplicate URLs" "NONE — all routes unique" "Green"
    WriteStatus "  Total unique routes" "$($uniqueRoutes.Count)"
} else {
    Write-Host "  DUPLICATE URLS FOUND:" -ForegroundColor Red
    foreach ($c in $conflicts) {
        Write-Host "    $($c.Key):" -ForegroundColor Red
        foreach ($f in $c.Value) { Write-Host "      $f" -ForegroundColor Red }
    }
}
Write-Host ""

Write-Host "5. DEV SERVER STATUS"
Write-Host "-------------------------------------------"
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
WriteStatus "  node.exe processes" "$($nodeProcs.Count)"
$serverProcs = $nodeProcs | Where-Object { $_.WorkingSet64 -gt 50000000 -or $_.CPU -gt 0.1 }
if ($serverProcs.Count -gt 0) {
    foreach ($proc in $serverProcs) {
        WriteStatus "  PID $($proc.Id)" "CPU: $($proc.CPU) min, Mem: $([math]::Round($proc.WorkingSet64/1MB,1)) MB"
    }
}
Write-Host ""

Write-Host "============================================"
if ($allClean -and (Test-Path (Join-Path $web ".next\dev\types\routes.d.ts"))) {
    Write-Host "  ALL CHECKS PASSED — ready for testing" -ForegroundColor Green
} else {
    if (-not $allClean) {
        Write-Host "  Shadow routes remain — run cleanup first" -ForegroundColor Red
    }
    if (-not (Test-Path (Join-Path $web ".next\dev\types\routes.d.ts"))) {
        Write-Host "  routes.d.ts missing — start dev server to generate" -ForegroundColor Yellow
    }
}
Write-Host "============================================"

