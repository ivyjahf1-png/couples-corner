Set-Location 'c:/Users/HomePC/Documents/couples-corner'
Write-Host '=== messages dir contents ==='
Get-ChildItem -Path 'web/app/(app)/messages' -Force -Recurse
exit 0
