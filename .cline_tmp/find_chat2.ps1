$base = 'c:/Users/HomePC/Documents/couples-corner'
$file = $base + '/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Write-Host "File: $file"
Write-Host "Test-Path: $(Test-Path $file)"
if (Test-Path $file) {
    $lines = Get-Content $file
    Write-Host "Total lines: $($lines.Count)"
} else {
    $full = Get-ChildItem -Path $base/web -Filter ChatRoomClient.tsx -Recurse -ErrorAction SilentlyContinue
    foreach ($f in $full) {
        Write-Host "Found: $($f.FullName)"
    }
}
exit 0
