param([int]$Skip,[int]$First,[string]$Path)
Get-Content -LiteralPath $Path | Select-Object -Skip $Skip -First $First | ForEach-Object { $i++; "$($Skip+$i): $_" }
