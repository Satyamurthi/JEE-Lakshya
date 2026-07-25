$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Yogeshwari\New folder\YO FINAL 12345678_formatted 123456.docx')

foreach ($p in $doc.Paragraphs) {
    $text = $p.Range.Text
    if ($text.Length -gt 350 -and $text -notmatch "Table") {
        Write-Output "---"
        Write-Output $text.Trim()
    }
}
$doc.Close($false)
$word.Quit()
