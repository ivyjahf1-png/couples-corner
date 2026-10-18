$base = 'c:/Users/HomePC/Documents/couples-corner'
Set-Location $base
$path = 'web/app/(app)/task/upload-moment/page.tsx'
$lines = Get-Content $path
$idx = @($lines).IndexOf('Back to Task Center')
if ($idx -gt -1) {
    $min = if ($idx - 5 -lt 0) { 0 } else { $idx - 5 }
    for ($i = $min; $i -le ($idx + 10); $i++) {
        Write-Host ("$($i+1)|$($lines[$i])")
    }
}
exit 0
