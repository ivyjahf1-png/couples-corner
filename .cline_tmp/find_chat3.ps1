$base = 'c:/Users/HomePC/Documents/couples-corner'
$file = $base + '/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
$file2 = $base + '\web\app\(app)\messages\[conversationId]\ChatRoomClient.tsx'
Write-Host "File1: $file"
Write-Host "File2: $file2"
Write-Host "Test1: $(Test-Path $file)"
Write-Host "Test2: $(Test-Path $file2)"
exit 0
