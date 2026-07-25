$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('e:\Vishruth Reports\Yogeshwari\New folder\YO FINAL 12345678_formatted 123456.docx')

$replacements = @{
    "Visual merchandisers apply similarity by arranging products" = "Professional merchandisers frequently employ the psychological principle of similarity, physically grouping items with identical packaging hues to form massive, unified color blocks. This color-blocking technique significantly reduces the visual noise on a crowded supermarket shelf, allowing the consumer's brain to quickly isolate and identify specific product families."
    "According to the Howard-Sheth model, shoppers seek to simplify" = "Rooted in the Howard-Sheth model of consumer behavior, it is understood that shoppers inherently seek cognitive shortcuts to simplify their decision-making processes. Within a massive hypermarket, vibrant aisle displays and strategic product placements function as powerful cognitive cues, instantly triggering dormant brand memories and facilitating rapid, low-effort purchasing decisions."
    "The study demonstrates that organized product stacks and prominent" = "Empirical data from this study proves conclusively that meticulously arranged product stacks, combined with highly visible end-caps, successfully capture consumer focus. By dominating the shopper's visual field, these strategic placements are directly responsible for driving a significant volume of impulse buys across the FMCG category."
    "The author highlights that retail shelf space is limited, and brands" = "Academic literature heavily emphasizes the brutal scarcity of physical retail shelf space. Consequently, FMCG brands that successfully negotiate for premium, eye-level shelf positioning consistently report exponentially higher sales velocities compared to competitors relegated to the less visible bottom or top shelves."
    "Clear, visually distinct signage containing pricing and discount" = "Highly visible and unambiguous promotional signage is absolutely critical for stopping foot traffic in a supermarket aisle. When discount tags and bundle offers are boldly displayed, they instantly communicate financial value, allowing the shopper to quickly compare competing items and accelerating the final purchase action."
    "The research highlights that window displays and entrance stands" = "This research confirms a two-tiered effect for visual merchandising: exterior window displays and massive entrance kiosks successfully lure passing foot traffic into the store, whereas organized interior shelves and localized aisle promotions actually close the sale by guiding the consumer to specific FMCG products."
    "Placing complementary products together (such as snacks near beverages" = "The strategic practice of cross-merchandising—such as placing ITC's Bingo! chips directly adjacent to cold beverages—capitalizes on psychological association. This visual pairing acts as an immediate subconscious reminder, successfully tempting shoppers into purchasing complementary items they had absolutely no prior intention of buying."
    "Packaging is a critical element in capturing shopper attention on" = "In a hyper-competitive retail environment, a product's primary packaging serves as its most vital marketing asset. Premium packaging materials, distinct typographical choices, and bold color palettes are essential for piercing through the visual clutter of a supermarket shelf and seizing the consumer's immediate attention."
    "Modern trade shoppers have multiple brand options. When their preferred" = "Today's retail consumer enjoys an overwhelming abundance of brand choices. Consequently, brand loyalty is highly fragile; if a shopper’s preferred ITC product is missing from the shelf, they will almost instantly switch to a readily available competitor rather than delaying their purchase or searching for a store clerk."
    "Shelf organization techniques, particularly color-blocking, reduce visual" = "Implementing advanced shelf organization strategies, most notably color-blocking, is crucial for minimizing visual exhaustion. By transforming a chaotic wall of mixed products into clearly demarcated, color-coordinated zones, retailers drastically improve shopper navigation, leading to a much more pleasant and financially lucrative store visit."
    "Creative, visually appealing storefront window displays attract passing" = "Imaginative and highly aesthetic storefront window installations serve as the primary hook for capturing external foot traffic. By sparking curiosity and projecting a premium retail image, these exterior displays successfully pull hesitant shoppers off the street and into the aisles, directly driving total store revenue."
    "Regular audits of shelf spaces, display stands, and pricing tags ensure" = "To guarantee the continuous effectiveness of visual merchandising, brands must mandate rigorous, unannounced retail audits. Regularly inspecting shelf arrangements, verifying the accuracy of pricing tags, and ensuring promotional stands are fully stocked is absolutely mandatory for sustaining long-term brand performance and retail compliance."
    "Red and yellow promotional tags attract immediate attention, significantly" = "Retailers universally rely on vibrant red and yellow promotional tagging because these specific colors trigger immediate psychological urgency. When pricing discounts are clearly communicated using these high-contrast hues, shopper confusion is eliminated, and the probability of an immediate, unplanned purchase skyrockets."
    "Grid layout configurations that guide shoppers through a structured" = "By utilizing rigid grid layout architectures, supermarkets deliberately force consumers to navigate along predetermined, winding paths. This forced navigation maximizes the shopper's exposure to thousands of secondary product categories, drastically increasing their 'dwell time' and inevitably resulting in a larger basket size upon checkout."
    "Attractive display stands can trigger impulse purchases for both high" = "While visually stunning promotional kiosks can induce impulse buying across all product tiers, premium brands experience a vastly disproportionate benefit. High-equity FMCG products placed on premium standalone displays see massive, immediate spikes in sales volume compared to lesser-known, generic items placed on identical stands."
    "Aisle end-caps receive up to 5 times more visual exposure than standard" = "Data indicates that aisle end-caps generate up to five times the visual impressions of standard, mid-aisle shelving. By monopolizing these high-traffic intersection points with top-selling ITC inventory, store managers can mathematically guarantee maximum product visibility and rapid inventory turnover."
    "Up to 68% of FMCG brand selections are made in the store, highlighting" = "Industry statistics reveal that nearly 70% of all FMCG purchasing decisions are finalized at the exact moment the shopper stands before the shelf. This staggering metric underscores why immaculate shelf neatness, bright pricing tags, and dominant visual displays are vastly more important than pre-store television advertising."
    "Doubling the number of shelf facings increases brand visibility and selection" = "Mathematically, increasing a product’s shelf facings directly correlates to higher sales volumes. Expanding a brand's footprint horizontally across the shelf commands greater visual authority, while securing the highly coveted 'Golden Shelf' (eye-level placement) virtually guarantees a massive competitive advantage over rival products."
    "Moving a product from bottom shelf to eye-level increases its sales by 39%" = "Empirical retail studies demonstrate that relocating a product from the bottom shelf up to eye-level generates an immediate 39% surge in sales volume. Even moving a product down from the top shelf to the central eye-level zone produces a 15% sales lift, proving that physical positioning dictates financial success."
    "Neat, organized product arrangements and clean store displays lead consumers" = "Consumers subconsciously equate the physical cleanliness of a store shelf with the actual quality and safety of the product itself. Pristine, highly organized displays foster deep brand trust, whereas chaotic, dusty, or disorganized shelving immediately triggers psychological aversion and severely damages brand equity."
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

Write-Output "Successfully replaced $count paragraphs in Batch 3 (Chapters 3-4)."

$doc.Save()
$doc.Close()
$word.Quit()
