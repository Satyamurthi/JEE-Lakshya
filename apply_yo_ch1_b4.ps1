$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Yogeshwari\New folder\YO FINAL 12345678_formatted 123456.docx')

$replacements = @{
    "Visual merchandising is confirmed as a major influence on purchase choices" = "The empirical survey data confirms that visual merchandising is a decisive factor in finalizing purchase decisions. A combined total of nearly half the respondents (agreeing and strongly agreeing) stated that attractive displays actively influenced their final brand selection within the supermarket."
    "Nearly 50% of respondents agreeing that visual merchandising influences" = "With almost half of the surveyed shoppers acknowledging that visual layouts dictate their purchasing behavior, the critical importance of point-of-sale marketing is undeniable. This metric proves that in-store aesthetics are just as important, if not more so, than traditional television advertising."
    "A positive visibility rating (57.6% Good) shows that ITC's current retail" = "While a majority visibility rating of 57.6% indicates that ITC's existing retail execution is reasonably effective, it also highlights a significant vulnerability. The substantial remaining percentage of shoppers who rated the displays as merely 'average' or 'poor' represents a massive volume of lost potential sales."
    "To improve product visibility, ITC should establish strict shelf-share and facing" = "To aggressively combat this visibility deficit, ITC must negotiate inflexible shelf-share agreements with its modern trade partners. Guaranteeing that highly profitable flagship brands—such as Sunfeast Dark Fantasy and Bingo! Mad Angles—receive disproportionately large shelf facings will immediately rectify these visibility issues."
    "The value of eye-level shelf placement is confirmed by shoppers, with" = "The undisputed value of eye-level product placement is heavily corroborated by the consumer data. A significant 33.81% of shoppers explicitly confirmed that products positioned directly at eye-level dramatically increase their likelihood of initiating a purchase."
    "Over 46% of respondents agreeing that eye-level placement increases purchase" = "When combining all positive responses, the data cements the concept of the 'Golden Shelf' as a retailer's most valuable asset. FMCG products that are positioned horizontally within the shopper's natural line of sight experience substantially higher movement compared to goods placed near the floor."
    "ITC sales teams should prioritize securing eye-level shelf space during trade" = "Consequently, ITC's regional trade marketing teams must aggressively prioritize the acquisition of eye-level real estate during all vendor negotiations. This is particularly crucial for impulse-driven categories, such as confectionery and salty snacks, where immediate visual contact is mandatory for a sale."
    "The analysis of customer suggestions highlights areas where in-store merchandising" = "An evaluation of qualitative consumer feedback reveals clear opportunities for in-store optimization. Shoppers consistently recommended that brands focus on 'Eye-level placement' and 'Vibrant pricing tags' to make the chaotic supermarket environment easier to navigate."
    "These recommendations confirm that visibility and shelf organization are essential" = "These direct shopper suggestions prove that logical shelf organization is not merely an aesthetic choice, but a fundamental requirement for consumer convenience. Shoppers inherently expect dominant market leaders like ITC to provide frictionless, highly visible retail experiences."
    "The analysis of in-store displays, product arrangements, and visual cues confirms" = "Ultimately, the comprehensive analysis of store displays and merchandising cues conclusively validates their power in capturing consumer attention. When deployed strategically, these visual elements successfully interrupt the shopper's routine, forcing them to engage with the targeted ITC product."
    "Furthermore, the structured organization of shelves emerged as a key driver" = "Additionally, the strict physical organization of retail shelves was identified as a primary catalyst for consumer engagement. A significant portion of respondents specifically cited 'Product Arrangement' as the single most important factor that caught their eye while traversing the aisles."
    "Finally, attractive visual merchandising is confirmed as a critical determinant" = "Finally, the study establishes that compelling visual merchandising acts as the ultimate tiebreaker in brand selection. The vast majority of shoppers admitted that when choosing between two identical products, the one with the superior in-store display almost always wins the sale."
    "Additionally, shelf organization and neatness support shopping convenience. Clean" = "Furthermore, immaculate shelf neatness directly enhances overall shopping convenience. When shelves are perfectly aligned and products are clearly categorized, shoppers can rapidly locate their desired ITC brands without experiencing the frustration typically associated with disorganized, cluttered grocery aisles."
    "The low involvement and frequent purchase cycle of snack and confectionery" = "Because snack foods and chocolates are inherently low-involvement, high-frequency purchases, they are incredibly susceptible to aggressive visual triggers. Deploying custom-designed point-of-sale stands near checkout registers is the most effective method for instantly capturing this impulse-buying demographic."
    "The present study, titled 'Impact of Store Display and Merchandising on ITC" = "This comprehensive academic report, titled 'Impact of Store Display and Merchandising on ITC Product Sale,' meticulously evaluated how physical in-store marketing tactics directly correlate with the retail sales velocity of ITC Limited's diverse FMCG portfolio."
    "The research shows a high level of shopper awareness and positive perception" = "The collected data highlights a massive level of consumer responsiveness to organized product facings, strategic eye-level placement, and high-contrast promotional signage, proving that modern Indian shoppers are highly sensitive to retail aesthetics."
    "The consistency of the findings between the pilot survey and the larger validation" = "Because the results remained highly consistent across both the initial pilot study and the massive master validation survey, the conclusions drawn in this report are statistically robust. The data reliably proves that stock-outs and cluttered aisles uniformly damage sales across all demographic groups."
    "In conclusion, store display and visual merchandising are essential elements" = "To conclude, aggressive visual merchandising and intelligent store displays are absolutely mandatory components of modern FMCG marketing. By harmonizing eye-catching exterior window displays with flawless internal shelf execution, ITC can successfully dominate the physical retail environment."
    "This retail excellence strategy provides a practical and scalable solution to compete" = "Implementing this strategy of retail excellence offers ITC a highly pragmatic and infinitely scalable framework for outmaneuvering competitors in the crowded FMCG landscape. It simultaneously provides retail partners with increased foot traffic while securing long-term brand loyalty from consumers."
}

$count = 0
foreach ($p in $doc.Paragraphs) {
    $text = $p.Range.Text.Trim()
    foreach ($key in $replacements.Keys) {
        if ($text.StartsWith($key)) {
            $rng = $p.Range
            $rng.MoveEnd(4, -1) | Out-Null
            $rng.Text = $replacements[$key]
            $count++
            break
        }
    }
}

Write-Output "Successfully replaced $count paragraphs in Batch 4 (Chapters 5-6)."

$doc.Save()
$doc.Close()
$word.Quit()
