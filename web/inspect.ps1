$f = 'write_components.ps1'
if (Test-Path $f) {
    $lines = Get-Content $f
    Write-Host "Total lines: $($lines.Count)"
    for ($i = 0; $i -lt 30; $i++) {
        if ($i -lt $lines.Count) {
            Write-Host "$($i + 1): $($lines[$i])"
        }
    }
}
