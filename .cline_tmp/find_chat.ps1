Set-Location 'c:/Users/HomePC/Documents/couples-corner'
$file = 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
Write-Host "File: $file"
$lines = Get-Content $file
Write-Host "Total lines: $($lines.Count)"
$keys = @('MediaRecorder', 'audio', 'image', 'video', 'upload', 'composer', 'pos')
foreach ($k in $keys) {
    $matches = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $k) {
            $matches += $i + 1
        }
    }
    Write-Host "$k : matched $(($matches | Select -First 5) -join ', ')"
}
exit 0
