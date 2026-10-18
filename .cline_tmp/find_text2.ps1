$base = 'c:/Users/HomePC/Documents/couples-corner'
Set-Location $base
$path = 'web/app/(app)/task/upload-moment/page.tsx'
$lines = Get-Content $path
Write-Host "Total lines: $($lines.Count)"
$matches = @()
foreach ($i in 0..($lines.Count-1)) {
    if ($lines[$i] -match 'Back to Task') {
        Write-Host "Found at line $($_ + 1): $($lines[$i])"
        $matches += $i
    }
}
Write-Host "Total matches: $($matches.Count)"
exit 0
