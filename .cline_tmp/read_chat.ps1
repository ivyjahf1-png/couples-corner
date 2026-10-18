Set-Location 'c:/Users/HomePC/Documents/couples-corner'
$file = 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
$content = Get-Content $file -Raw
$content | Out-File -FilePath 'c:/Users/HomePC/Documents/couples-corner/.cline_tmp/chat_client.txt' -Encoding UTF8
Write-Host "Written"
exit 0
