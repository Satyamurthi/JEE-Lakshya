$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Astral_Coatings_Dealer_Relationship_Report_11_expanded.docx')

$startFound = $false
foreach ($p in $doc.Paragraphs) {
    $text = $p.Range.Text
    if ($text -match "4 RESEARCH METHODOLOGY") { $startFound = $true }
    if ($startFound -and $text.Length -gt 350 -and $text -notmatch "Table") {
        Write-Output "---"
        Write-Output $text.Substring(0, [math]::Min(150, $text.Length))
    }
}
$doc.Close($false)
$word.Quit()
