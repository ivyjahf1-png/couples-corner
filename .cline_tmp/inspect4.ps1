$fullPath = 'c:\Users\HomePC\Documents\couples-corner\web\app\(app)\messages\[conversationId]\ChatRoomClient.tsx'
Write-Host "Test-Path result: $(Test-Path $fullPath)"
if (Test-Path $fullPath) {
    $content = Get-Content $fullPath
    Write-Host "File exists, $(($content | Measure-Object -Line).Lines) lines"
} else {
    Write-Host "File not found"
}
exit 0
