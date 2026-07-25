$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Yogeshwari\New folder\YO FINAL 12345678_formatted 123456.docx')
$text = $doc.Content.Text
$text | Out-File "e:\Vishruth Reports\yo_text_full.txt" -Encoding UTF8
$doc.Close($false)
$word.Quit()
