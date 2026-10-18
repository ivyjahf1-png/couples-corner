Set-Location 'c:/Users/HomePC/Documents/couples-corner'
Write-Host '=== [conversationId] dir ==='
Get-ChildItem -Path 'web/app/(app)/messages/[conversationId]' -Recurse -Directory
Write-Host ''
Write-Host '=== [conversationId] files ==='
Get-ChildItem -Path 'web/app/(app)/messages/[conversationId]' -Recurse -File
exit 0
