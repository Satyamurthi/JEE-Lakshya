def generate_clean_doc_html(subject, questions):
    # Group and sort chapter wise
    chapter_map = {}
    for q in questions:
        ch = q.get('chapter') or 'General / Uncategorized'
        if ch not in chapter_map:
            chapter_map[ch] = []
        chapter_map[ch].append(q)
        
    sorted_chapters = sorted(chapter_map.keys())

    html = """<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>JEE Question Bank Export - """ + str(subject) + """</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
body { font-family: 'Calibri', 'Arial', sans-serif; margin: 1in; color: #1e293b; line-height: 1.5; font-size: 11pt; }
h1 { font-size: 20pt; color: #1e1b4b; text-align: center; border-bottom: 2pt solid #4f46e5; padding-bottom: 6pt; margin-bottom: 15pt; }
h2 { font-size: 14pt; color: #4338ca; background-color: #f1f5f9; padding: 6pt 10pt; margin-top: 20pt; margin-bottom: 10pt; border-left: 4pt solid #4f46e5; }
.meta-info { text-align: center; font-size: 10pt; color: #64748b; margin-bottom: 20pt; }
.question-block { margin-bottom: 18pt; page-break-inside: avoid; }
.q-title { font-size: 11pt; font-weight: bold; color: #0f172a; margin-bottom: 4pt; }
.pyq-tag { font-weight: bold; color: #3730a3; background-color: #e0e7ff; padding: 2pt 6pt; font-size: 9.5pt; }
.options-table { width: 100%; margin-top: 6pt; margin-bottom: 6pt; border-collapse: collapse; }
.options-table td { padding: 4pt 8pt; vertical-align: top; font-size: 10.5pt; width: 50%; }
.ans-box { font-weight: bold; color: #15803d; background-color: #f0fdf4; padding: 4pt 8pt; border: 1pt solid #bbf7d0; font-size: 10pt; margin-top: 4pt; display: inline-block; }
.sol-box { font-size: 10pt; color: #334155; background-color: #f8fafc; padding: 6pt 10pt; border-left: 2pt solid #94a3b8; margin-top: 4pt; }
</style>
</head>
<body>
<h1>OFFICIAL JEE QUESTION BANK - """ + str(subject).upper() + """</h1>
<div class='meta-info'>Arranged Chapter-Wise | Total Questions: <strong>""" + str(len(questions)) + """</strong></div>
"""
    q_global_idx = 1
    for ch_name in sorted_chapters:
        q_list = chapter_map[ch_name]
        html += f"<h2>CHAPTER: {ch_name.upper()} ({len(q_list)} Questions)</h2>\n"
        for idx, q in enumerate(q_list):
            year = q.get('year') or q.get('exam_session') or q.get('pyq_info')
            if year:
                pyq_text = f"({year} Q{idx+1})"
            else:
                pyq_text = f"(JEE Main PYQ Archive Q{idx+1})"
                
            stmt = q.get('statement') or q.get('question') or ''
            html += f"<div class='question-block'>\n"
            html += f"<div class='q-title'>Question {q_global_idx}. <span class='pyq-tag'>{pyq_text}</span> {stmt}</div>\n"
            
            # Options
            opts = q.get('options')
            if opts:
                html += "<table class='options-table'><tr>"
                if isinstance(opts, dict):
                    keys = list(opts.keys())
                    for i, k in enumerate(keys):
                        if i > 0 and i % 2 == 0:
                            html += "</tr><tr>"
                        html += f"<td><strong>({k})</strong> {opts[k]}</td>"
                elif isinstance(opts, list):
                    labels = ['A', 'B', 'C', 'D']
                    for i, val in enumerate(opts):
                        if i > 0 and i % 2 == 0:
                            html += "</tr><tr>"
                        lbl = labels[i] if i < 4 else str(i+1)
                        html += f"<td><strong>({lbl})</strong> {val}</td>"
                html += "</tr></table>\n"
                
            corr = q.get('correctAnswer') or q.get('answer')
            if corr:
                html += f"<div class='ans-box'>Correct Answer: ({corr})</div>\n"
                
            sol = q.get('solution') or q.get('explanation')
            if sol:
                html += f"<div class='sol-box'><strong>Solution & Explanation:</strong> {sol}</div>\n"
                
            html += "</div>\n<hr style='border: none; border-top: 1px dashed #cbd5e1; margin: 12pt 0;'/>\n"
            q_global_idx += 1
            
    html += "</body></html>"
    return html

print("Template generator test ready!")
