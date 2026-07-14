$c = [IO.File]::ReadAllText("$PWD\cloudfunctions\rings_engine\index.js")
$i1 = $c.IndexOf('handleChatPolish')
$i2 = $c.IndexOf('handleChatSuggest')
Write-Host "=== handleChatPolish at: $i1 ==="
if ($i1 -ge 0) {
    $s1 = $c.Substring($i1, [Math]::Min(1800, $c.Length - $i1))
    Write-Host $s1
}
Write-Host ""
Write-Host "=== handleChatSuggest at: $i2 ==="
if ($i2 -ge 0) {
    $s2 = $c.Substring($i2, [Math]::Min(1800, $c.Length - $i2))
    Write-Host $s2
}
