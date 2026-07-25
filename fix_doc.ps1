$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Yogeshwari\YO_FINAL_Humanized.docx')

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
    $find.Execute($findText, $false, $false, $false, $false, $false, $true, 1, $false, $replaceText, 2)
}

# 1. Remove the objectives
Replace-Text "The objectives of this study were: (1) to analyze the role of '" "Focusing on '"
Replace-Text "' in modern trade networks; (2) to investigate the correlation between in-store cues and shopper choices; and (3) to propose guidelines to optimize retail shelf interactions." "', this research examines in-store behaviors."

# 2. Fix the methodology boilerplate
Replace-Text "Sourcing empirical observations of shopper behavior, " "Based on empirical data, "
Replace-Text " shows that distinct visual cues serve as cognitive shortcuts, guiding selections and reducing search times. The study highlights visual merchandising as a cost-effective trade marketing tool to drive brand choice." " found that strategic visual placement significantly influences consumer decision-making."

# 3. Remove the relevance boilerplate
Replace-Text "Relevance to current study:" ""
Replace-Text "This study provides empirical support for shelf space allocation, packaging visibility, and pricing communication parameters. The conclusions guide our framework to analyze visual merchandising effectiveness across supermarkets in Dharwad for ITC categories." ""

$doc.Save()
$doc.Close()
$word.Quit()
