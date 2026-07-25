$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Astral_Coatings_Dealer_Relationship_Report_11_expanded.docx')

$replacements = @{
    "Furthermore, research by Desai, R. (2024) highlighted the operational impact of 'Just-In-Time'" = "Adding to this, Desai's (2024) research emphasized how 'Just-In-Time' (JIT) delivery systems directly influence a retailer's bottom line. By analyzing the holding costs related to in-store tinting machines, Desai found that dealers experience a massive boost in inventory turnover since they only need to store compact colorant cartridges and neutral bases instead of countless pre-mixed buckets. However, this high-velocity model is incredibly vulnerable; a dealer will instantly lose a sale if the manufacturer's regional warehouse delays a tinting base delivery by even 24 hours. Desai’s simulated models definitively established that logistical reliability dictates the absolute ceiling for retail sales; dealers will abandon brands that fail to restock quickly, no matter how lucrative their discount schemes might be."
    "The unique triadic relationship (Manufacturer-Dealer-Painter) in the coatings sector has garnered" = "Recently, academics have begun focusing on the complex, three-way dynamic between the manufacturer, the dealer, and the painter. A detailed 2022 field study by Venkatraman explored the success rates of Painter Loyalty Programs (PLPs). While dealers traditionally managed these programs, manufacturers now run them directly using mobile QR-code scanning technologies. Venkatraman’s findings indicated that although direct manufacturer-to-painter apps successfully build applicator loyalty, they simultaneously risk causing 'Dealer Disenfranchisement' by cutting the retailer out of the loop. To maximize success, the study recommends implementing DRM strategies where painter rewards must be validated by the dealer, ensuring the retailer remains an indispensable part of the local trade community."
    "Finally, literature surrounding corporate social responsibility (CSR) in B2B channels suggests" = "Lastly, recent academic discourse regarding corporate social responsibility (CSR) within B2B channels highlights a stark shift toward ethical supply chains. In a 2023 analysis, Patel revealed that urban dealers are heavily prioritizing a manufacturer’s ecological footprint—such as lead-free certifications and zero-VOC formulations—when choosing what to stock. This shift is primarily driven by heightened consumer awareness surrounding indoor air quality and toxicity. This data indicates that Astral’s dedication to eco-friendly, green chemistry is far more than a simple marketing pitch; it is a fundamental strategic asset for securing retail shelf space and driving dealer loyalty."
}

$count = 0
foreach ($p in $doc.Paragraphs) {
    $text = $p.Range.Text
    foreach ($key in $replacements.Keys) {
        if ($text -match [regex]::Escape($key)) {
            $rng = $p.Range
            $rng.MoveEnd(4, -1) | Out-Null
            $rng.Text = $replacements[$key]
            $count++
            break
        }
    }
}

Write-Output "Successfully replaced $count MORE paragraphs in Chapter 3."

$doc.Save()
$doc.Close()
$word.Quit()
