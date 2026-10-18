Set-Location 'c:/Users/HomePC/Documents/couples-corner'
$file = 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
$content = Get-Content $file
$content -join [Environment]::NewLine | Out-File -FilePath 'c:/Users/HomePC/Documents/couples-corner/.cline_tmp/chat_client.txt' -Encoding UTF8
Write-Host "Written"
exit 0
