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
Replace-Text "The objectives of this study were: (1) to analyze the role of '" "Focusing on '"
Replace-Text "' in paint distribution networks; (2) to investigate the correlation between channel partner support and sales performance; " "', this research examines partner interactions. "
Replace-Text "and (3) to propose guidelines to optimize distributor-dealer interactions." ""

# 2. Fix the methodology boilerplate
Replace-Text "Sourcing empirical observations of B2B channels, " "Based on empirical data, "
Replace-Text " shows that dealer support serves as a strategic resource, guiding brand preference and reducing channel conflict. " " found that effective support significantly reduces channel conflict. "
Replace-Text "The study highlights dealer relationship management as a key tool to drive retail paint sales performance." ""

# 3. Remove the relevance boilerplate
Replace-Text "Relevance to current study:" ""
Replace-Text "This study provides empirical support for B2B channel coordination, credit management, and digital dealer portal adoption. " ""
Replace-Text "The conclusions guide our framework to analyze dealer relationship management effectiveness for Astral Chemie Ltdacross paint dealers in the Dharwad region." ""

$doc.Save()
$doc.Close()
$word.Quit()
