$file = 'components\app\ConversationSummaryCard.tsx'
if (Test-Path $file) {
    $lines = Get-Content $file
    Write-Host "File exists. Lines: $($lines.Count)"
    Write-Host "=== First 5 lines ==="
    for ($i = 0; $i -lt [Math]::Min(5, $lines.Count); $i++) {
        Write-Host "$($i + 1): $($lines[$i])"
    }
    Write-Host "=== Lines 65-75 ==="
    for ($i = 64; $i -le [Math]::Min(74, $lines.Count - 1); $i++) {
        Write-Host "$($i + 1): $($lines[$i])"
    }
} else {
    Write-Host "FILE DOES NOT EXIST: $file"
}
