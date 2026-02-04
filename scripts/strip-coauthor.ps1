# Reads commit message from stdin, removes Co-authored-by: Cursor line, writes to stdout
$input = [System.Console]::In.ReadToEnd()
$line = "Co-authored-by: Cursor <cursoragent@cursor.com>"
$input = $input -replace "(?m)^$([regex]::Escape($line))\r?\n?", ""
$input.TrimEnd() | Write-Output
