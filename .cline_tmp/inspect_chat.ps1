$base = 'c:/Users/HomePC/Documents/couples-corner'
Set-Location $base

Write-Host '=== CHAT MEDIA HANDLERS ==='
$chatFile = 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Get-Content $chatFile | Select-String 'MediaRecorder|upload|audio|image|video' | Select-Object -First 40
exit 0
