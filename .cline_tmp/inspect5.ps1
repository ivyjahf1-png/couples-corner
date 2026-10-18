Set-Location 'c:/Users/HomePC/Documents/couples-corner'
Write-Host '=== (app) directory files ==='
Get-ChildItem -Path 'web/app/(app)' -Recurse -Directory
Write-Host ''
Write-Host '=== chat dir files ==='
Get-ChildItem -Path 'web/app/(app)/messages' -Recurse -Directory
exit 0
