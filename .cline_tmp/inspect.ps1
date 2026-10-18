$base = 'c:/Users/HomePC/Documents/couples-corner'
Set-Location $base

Write-Host '=== GIT STATUS ==='
git status --short
Write-Host '=== BRANCH ==='
git branch --show-current
Write-Host '=== LOG ==='
git log --oneline -3
Write-Host '=== LAYOUT VIEWPORT ==='
Get-Content web/app/layout.tsx | Select-String -Pattern 'viewport|metadata' | Select-Object -First 20
Write-Host '=== UPLOAD MOMENT BACK TO TASK ==='
Get-Content web/app/(app)/task/upload-moment/page.tsx | Select-String -Pattern 'Back to Task|router.push|setUploadDone|Done|uploaded|Uploaded' | Select-Object -First 20
Write-Host '=== VOICE/GIF/CHAT UPLOAD ==='
Get-Content web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx | Select-String -Pattern 'MediaRecorder|file|upload|audio|image|video' | Select-Object -First 40
Write-Host '=== DONE ==='
exit 0
