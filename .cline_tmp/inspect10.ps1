Set-Location 'c:/Users/HomePC/Documents/couples-corner'
Write-Host '=== Git ls-files ==='
git ls-files 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Write-Host ''
Write-Host '=== Test alternate paths ==='
$paths = @(
    'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx',
    'web/app/(app)/messages/[conversationId]/chatroomclient.tsx',
    'web/app/(app)/messages/[conversationId]/ChatRoom.tsx'
)
foreach ($p in $paths) {
    $exists = Test-Path $p
    Write-Host "$p : $exists"
}
exit 0
