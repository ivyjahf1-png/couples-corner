$file = 'c:/Users/HomePC/Documents/couples-corner/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Set-Location 'c:/Users/HomePC/Documents/couples-corner'
$content = Get-Content $file
Write-Host "Lines: $($content.Count)"
Write-Host "=== Lines 200-250 ==="
$content | Select-Object -Skip 199 -First 50 | ForEach-Object { Write-Host $_ }
exit 0
