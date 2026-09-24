$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\app\globals.css'
$bytes = [System.IO.File]::ReadAllBytes($path)
# Remove BOM if present (EF BB BF)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $bytes = $bytes[3..($bytes.Length-1)]
    Write-Host 'Removed BOM'
}
# Fix mojibake: EF E2 CC 82 E2 82 AC E2 80 9C = "â€" in UTF-8 bytes
# Replace the sequence E2 80 9C (left double quote ") that appears after â€
# The actual mojibake pattern is: E2 82 AC 93 (â€") where 93 is the broken char
# Actually let's just check what's there and replace smart quotes
$content = [System.Text.Encoding]::UTF8.GetString($bytes)
# Count occurrences of problematic sequences
$count = 0
$content = $content -replace 'â€"', '—'
$content = $content -replace 'â€', '—'
if ($content -ne [System.Text.Encoding]::UTF8.GetString($bytes)) {
    Write-Host "Fixed $count mojibake sequences"
}
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
[System.IO.File]::WriteAllBytes($path, $bytes)
Write-Host 'Saved'
