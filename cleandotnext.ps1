param(
    [Parameter(Position=0)]
    [string]$Dir = "c:\Users\HomePC\Documents\couple's conner\web\.next"
)
Remove-Item -Force -Recurse (Resolve-Path $Dir) -ErrorAction Ignore
Write-Host "DONE"
