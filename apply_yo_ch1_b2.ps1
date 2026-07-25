$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Yogeshwari\New folder\YO FINAL 12345678_formatted 123456.docx')

$replacements = @{
    "To support its quality standards, the company implements strict quality control" = "To relentlessly maintain these premium standards, ITC executes rigorous quality assurance protocols across its entire supply chain. From the initial procurement of raw agricultural commodities through to the final packaging and dispatch of finished goods, continuous laboratory testing guarantees product consistency and safety."
    "Aashirvaad is the market leader in the packaged wheat flour (atta)" = "Aashirvaad currently dominates the branded wheat flour (atta) segment across India. The cornerstone of the brand’s dominance is its direct-from-farm procurement strategy via the e-Choupal network, which secures premium wheat harvests. Furthermore, advanced mechanization during the milling and packaging phases ensures the flour remains totally untouched by human hands."
    "ITC entered the luxury chocolate market with Fabelle, offering boutique" = "Expanding into the ultra-premium confectionery segment, ITC launched the Fabelle brand. Positioned exclusively as a luxury product crafted from exotic cocoa blends, Fabelle chocolates are primarily retailed through exclusive boutiques located within ITC's five-star luxury hotel properties."
    "In contrast, B Natural represents ITC's presence in the fruit juice" = "On the beverage front, B Natural spearheads ITC's entry into the competitive fruit juice category. The brand heavily markets the fact that its products are formulated directly from 100% Indian fruit pulp rather than imported concentrates, appealing strongly to health-conscious domestic consumers."
    "Nestle India: A leading player in packaged foods. Nestle's Maggi" = "Nestle India stands as a formidable adversary in the packaged foods arena. Their iconic Maggi noodles represent the primary competition for ITC's YiPPee! brand, while their Nescafe and Munch lines battle fiercely against ITC’s Sunbean coffee and Candyman confectionery."
    "Godrej Consumer Products: Godrej is a prominent player in the personal" = "Godrej Consumer Products remains a heavyweight contender within the personal and home care segments. Legacy Godrej brands, such as Cinthol and Godrej No. 1, compete aggressively for retail shelf space alongside ITC’s premium Fiama and Vivel personal care lines."
    "Tata Consumer Products: Tata Tea and Tata Sampann compete in packaged" = "Tata Consumer Products constitutes another major competitive force. The Tata Sampann spice and pulse ranges, along with Tata Tea, challenge ITC's Aashirvaad staples and premium tea offerings, forcing both conglomerates to constantly innovate their point-of-sale merchandising tactics."
    "This shopping format increases the likelihood of unplanned or impulse" = "The sprawling format of modern hypermarkets exponentially increases the probability of impulse purchasing. When shoppers navigate large retail spaces, visual stimuli—ranging from attractive window displays to perfectly organized shelf facings—can easily trigger spontaneous buying decisions for items they had no intention of purchasing."
    "Shoppers in modern trade formats often exhibit structured shopping paths" = "Consumer movement within modern supermarkets is rarely random; shoppers typically follow highly structured navigation paths. The standard journey usually begins along the store's perimeter, where high-margin perishable goods like dairy and produce are located, before the shopper weaves through the central aisles to locate packaged goods and snacks."
    "The conceptual framework of this study examines the relationship between in-store" = "The theoretical foundation of this research thoroughly investigates the correlation between aggressive point-of-sale marketing and final consumer purchasing behaviors. Historically, consumers relied on local shopkeepers to fetch items; today, the visual layout of a self-service aisle acts as the primary salesperson, dictating which brand a consumer will ultimately select."
    "The conceptual framework proposes that store displays (including window" = "This framework asserts that strategic store displays—such as vibrant window graphics, prominent aisle end-caps, and clear promotional signage—exert a direct, measurable influence on brand recall. The hypothesis dictates that robust visual merchandising directly translates to elevated retail volume and heightened impulse purchasing."
    "By evaluating visual parameters such as shelf neatness, promotional pricing tags" = "By systematically measuring visual criteria—including shelf cleanliness, the clarity of discount tags, and product facing density—this research evaluates exactly how organized retail environments guide shopper psychology and influence final product selection in a crowded supermarket environment."
    "In contrast, modern trade formats feature open self-service layouts" = "Conversely, modern hypermarkets and self-service chains utilize open-plan architectural layouts, enabling customers to freely wander and physically handle merchandise. This tactile autonomy fundamentally alters the buying process, making visual aesthetics the most critical factor in capturing shopper interest."
    "Once inside, the arrangement of products on shelves guides the visual search" = "Upon entering the store, the specific arrangement of goods directly controls the consumer’s visual trajectory. Retailers frequently utilize 'color-blocking'—grouping similar packaging colors together—and clearly demarcated shelving tiers to help shoppers quickly scan categories and locate desired items without feeling overwhelmed."
    "Retail atmospherics refer to the design of the retail space to create" = "The concept of 'retail atmospherics' encompasses the deliberate architectural and sensory design of a store aimed at triggering specific psychological reactions. Core atmospheric elements, such as ambient lighting, background music, aisle width, and overall cleanliness, subconsciously manipulate shopper comfort and influence the duration of their store visit."
    "Supermarkets utilize structured grid layouts to guide shoppers through" = "To maximize product exposure, supermarkets almost exclusively employ structured grid layouts. This architectural design forces shoppers to navigate past dozens of secondary product categories while hunting for essential staples, utilizing bright overhead lighting to ensure every shelf remains highly visible."
    "Visual merchandisers use several techniques to secure attention" = "Expert visual merchandisers deploy an array of psychological tactics to arrest shopper attention. Grand, thematic storefront displays act as visual magnets to pull foot traffic inside, while strategically placed 'speed bumps'—small standalone promotional kiosks in the center of aisles—force shoppers to slow down and notice targeted products."
    "Promotional price tags, bulk discounts, and special package deals" = "Vibrantly colored promotional tags highlighting bulk discounts or 'Buy-One-Get-One' (BOGO) deals are universally deployed to signify immediate financial savings. Furthermore, these tags create a psychological sense of urgency, persuading consumers to stockpile products they perceive as heavily discounted."
    "Product accessibility is key: products must be positioned within easy" = "Physical accessibility is paramount; if a product cannot be easily reached or its price tag is obscured, the sale is instantly lost. Cluttered, chaotic shelving arrangements or out-of-stock gaps create severe psychological friction, often leading to immediate brand abandonment in favor of a competitor."
    "Gestalt psychology suggests that the human brain organizes visual elements" = "Drawing from Gestalt psychology, it is understood that the human brain subconsciously groups individual visual elements into cohesive, structured patterns. Consequently, when products are merchandised in uniform, symmetrical blocks, the shopper perceives the display as visually soothing and organized, which dramatically increases the likelihood of purchase."
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

Write-Output "Successfully replaced $count paragraphs in Batch 2 (Chapters 1-2)."

$doc.Save()
$doc.Close()
$word.Quit()
