Set-Location 'c:/Users/HomePC/Documents/couples-corner'
$f = 'web/app/(app)/task/upload-moment/page.tsx'
Write-Host "Path: $f"
$content = Get-Content $f
$content = $content -replace '(Back to Task Center)', ''
$content | Set-Content $f
Write-Host "Done"
exit 0
