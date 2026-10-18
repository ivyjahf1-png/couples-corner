Set-Location 'c:/Users/HomePC/Documents/couples-corner'
Write-Host '=== ChatRoomClient.tsx size ==='
$file = Get-Item 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Write-Host "Size: $($file.Length) bytes"
Write-Host '=== First 50 lines ==='
Get-Content $file.FullName | Select-Object -First 50
exit 0
