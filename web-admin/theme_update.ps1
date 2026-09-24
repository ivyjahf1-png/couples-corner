$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$replacements = @(
    # Order matters: longer/more-specific patterns first
    ("bg-slate-900-muted",   "bg-purple-900"),
    ("bg-surface-muted",     "bg-purple-800"),
    ("bg-slate-950",         "bg-purple-950"),
    ("bg-slate-900",         "bg-purple-900"),
    ("bg-slate-800",         "bg-purple-800"),
    ("bg-slate-700",         "bg-purple-700"),
    ("bg-surface",           "bg-purple-900"),
    ("text-slate-300",       "text-white"),
    ("text-slate-400",       "text-orange-300"),
    ("text-slate-500",       "text-orange-400"),
    ("text-slate-200",       "text-white"),
    ("text-slate-100",       "text-white"),
    ("text-ink-900",         "text-white"),
    ("text-ink-800",         "text-white"),
    ("text-ink-700",         "text-orange-200"),
    ("text-ink-600",         "text-orange-300"),
    ("text-ink-500",         "text-orange-400"),
    ("text-ink-400",         "text-orange-400"),
    ("border-ink-200",       "border-orange-500/30"),
    ("border-ink-300",       "border-orange-500/30"),
    ("border-brand-200",     "border-orange-500/30"),
    ("border-brand-600",     "border-orange-500"),
    ("border-brand-400",     "border-orange-500"),
    ("bg-brand-100",         "bg-purple-800"),
    ("bg-brand-50",          "bg-purple-800"),
    ("text-brand-700",       "text-white"),
    ("text-brand-800",       "text-white"),
    ("text-brand-600",       "text-orange-300"),
    ("divide-ink-200",       "divide-orange-500/30"),
)

$found = 0
Get-ChildItem -Recurse -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $original = $content
    foreach ($r in $replacements) {
        $content = $content -replace [regex]::Escape($r[0]), $r[1]
    }
    if ($content -ne $original) {
        $content | Set-Content $_.FullName -Encoding UTF8 -NoNewline
        Write-Host "UPDATED: $($_.Name)"
        $found++
    }
}

Write-Host "---"
Write-Host "Total files updated: $found"
