Get-ChildItem components\app\ConversationSummaryCard.tsx -ErrorAction SilentlyContinue | Select-Object Name, Length
Get-ChildItem components\app\* -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*Conversation*' -or $_.Name -like '*Summary*' } | Select-Object Name, Length
