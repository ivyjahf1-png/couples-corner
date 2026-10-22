param([string]$Path,[string]$Pattern)
Select-String -LiteralPath $Path -Pattern $Pattern | ForEach-Object { "{0}: {1}" -f $_.LineNumber, $_.Line.Trim() }
