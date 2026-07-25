$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Astral_Coatings_Humanized.docx')

function Replace-Text {
    param($findText, $replaceText)
    $find = $word.Selection.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    $find.Text = $findText
    $find.Replacement.Text = $replaceText
    $find.Forward = $true
    $find.Wrap = 1 # wdFindContinue
    $find.Format = $false
    $find.MatchCase = $false
    $find.MatchWholeWord = $false
    $find.MatchWildcards = $false
    $find.MatchSoundsLike = $false
    $find.MatchAllWordForms = $false
    $find.Execute($findText, $false, $false, $false, $false, $false, $true, 1, $false, $replaceText, 2) | Out-Null
}

# 1. Remove the objectives
Replace-Text "The objectives of this study were: (1) to analyze the role of " "Focusing on "
Replace-Text " in paint distribution networks; (2) to investigate the correlation between channel partner support and sales performance; " ", this research examines partner interactions. "

$doc.Save()
$doc.Close()
$word.Quit()
