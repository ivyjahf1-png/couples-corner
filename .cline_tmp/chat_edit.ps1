Set-Location -Path 'c:/Users/HomePC/Documents/couples-corner'

# Create a temporary copy of the chat client
$src = 'web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx'
$tmp = '.cline_tmp/chat_client_backup.tsx'

if (Test-Path $src) {
    Write-Host "Source exists, copying..."
    Copy-Item -Path $src -Destination $tmp -Force
    Write-Host "Backup created at $tmp"
} else {
    Write-Host "Source NOT found!"
    exit 1
}

# Read the file
$lines = Get-Content -Path $src

# Find the import section and add global declaration
$importSection = @(
    '"use client";'
    ''
    'import { useCallback,'
    '  useEffect, useMemo, useRef, useState, type FormEvent,'
    '  type KeyboardEvent as ReactKeyboardEvent,'
    '} from "react";'
)

# Find where to insert the global declaration
$insertIndex = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^import .* from \"react\";$') {
        $insertIndex = $i + 1
        break
    }
}

if ($insertIndex -gt 0) {
    Write-Host "Insert index: $insertIndex"
}
