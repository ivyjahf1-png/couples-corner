Set-Location 'c:/Users/HomePC/Documents/couples-corner'
$src = 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
$dest = '.cline_tmp/chat_client.tsx'
if (Test-Path $src) {
    Copy-Item $src $dest -Force
    Write-Host "Copied to $dest"
} else {
    Write-Host "Source not found"
}
exit 0
