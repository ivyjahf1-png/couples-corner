$base = 'c:/Users/HomePC/Documents/couples-corner'
$file = $base + '/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Write-Host "File: $file"
Write-Host "Test-Path: $(Test-Path $file)"
exit 0
