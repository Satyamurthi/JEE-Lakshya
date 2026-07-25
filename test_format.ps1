$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Astral_Coatings_Dealer_Relationship_Report_11_expanded.docx')
$doc.SaveAs([ref]'e:\Vishruth Reports\TestFormat.docx')
$doc.Close()

$doc = $word.Documents.Open('e:\Vishruth Reports\TestFormat.docx')

foreach ($p in $doc.Paragraphs) {
    if ($p.Range.Text -match "^The Indian paint industry is one of the fastest-growing sectors") {
        $rng = $p.Range
        $rng.MoveEnd(4, -1) | Out-Null # Move back 1 character
        $rng.Text = "TESTING REPLACEMENT OF TEXT PRESERVING FORMATTING"
        break
    }
}

$doc.Save()
$doc.Close()
$word.Quit()
