# Reads commit message from stdin, removes Co-authored-by lines, writes to stdout
$input = [System.Console]::In.ReadToEnd()
$input = $input -replace "(?m)^Co-authored-by:.*\r?\n?", ""
$input.TrimEnd() | Write-Output
