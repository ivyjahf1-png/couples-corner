function Write-Component($path, $content) {
    $fullPath = Join-Path $PWD $path
    $dir = Split-Path $fullPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Set-Content -Path $fullPath -Value $content -Encoding utf8
    Write-Host "Wrote: $fullPath size: $((Get-Item $fullPath).Length) bytes"
}
