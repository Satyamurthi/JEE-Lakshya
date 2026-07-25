$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Astral_Coatings_Dealer_Relationship_Report_11_expanded.docx')

foreach ($p in $doc.Paragraphs) {
    if ($p.Range.Text -match "^The Indian paint industry is one of the fastest-growing sectors") {
        Write-Output "Found target paragraph!"
        break
    }
}

$doc.Close($false)
$word.Quit()
