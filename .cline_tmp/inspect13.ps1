Set-Location 'c:/Users/HomePC/Documents/couples-corner'
Write-Host '=== Recent commits ==='
git log --oneline -5
Write-Host ''
Write-Host '=== Git status ==='
git status --short
Write-Host ''
Write-Host '=== File size ==='
git ls-files 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx' | ForEach-Object {
    $hash = git hash-object $_
    Write-Host "Hash: $hash"
}
exit 0
