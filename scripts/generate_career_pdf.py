import sys
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (Only on page 2 and later)
        if self._pageNumber > 1:
            self.drawString(36, 806, "CAREER GUIDANCE & JOB ANALYSIS REPORT — CSE (AI & ML) 4TH YEAR")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 800, 559, 800)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 25, footer_text)
        self.drawString(36, 25, "Confidential — Prepared specifically for 4th Year CSE (AI/ML) Student")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 35, 559, 35)
        
        self.restoreState()

def create_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0F172A")    # Slate 900
    accent_color = colors.HexColor("#2563EB")     # Blue 600
    green_color = colors.HexColor("#059669")      # Emerald 600
    red_color = colors.HexColor("#DC2626")        # Red 600
    amber_color = colors.HexColor("#D97706")      # Amber 600
    dark_gray = colors.HexColor("#334155")        # Slate 700
    light_bg = colors.HexColor("#F8FAFC")         # Slate 50

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=accent_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_gray,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        bulletIndent=4,
        spaceAfter=4
    )

    badge_green = ParagraphStyle(
        'BadgeGreen',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=green_color
    )

    badge_red = ParagraphStyle(
        'BadgeRed',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=red_color
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_body = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_gray
    )

    story = []

    # Title Banner
    story.append(Paragraph("CSE (AI & ML) CAREER & INTERNSHIP GUIDANCE", title_style))
    story.append(Paragraph("Detailed Analysis of Campus Drive Job Listings for 4th Year (Semester 7) Student", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=12))

    # Executive Overview
    story.append(Paragraph("1. Executive Summary & Why You Are Confused", h1_style))
    story.append(Paragraph(
        "As a 4th-year B.Tech student in <b>Computer Science & Engineering (Artificial Intelligence & Machine Learning)</b> in your 7th semester, looking at campus recruitment posters can be extremely overwhelming. The notice board images you shared list <b>over 100+ job designations across 40+ companies</b>, mixing specialized AI roles, core software engineering, core non-tech engineering (Civil/Mechanical), BPO/Voice processes, sales executives, cashier jobs, and store managers together without any domain categorization.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Key Takeaway:</b> Not all jobs listed on the notice board are meant for a CSE (AI/ML) engineer! Taking the wrong role (such as BPO, Sales, or Front Office) will waste your 4 years of specialized engineering education. This guide filters out the noise and provides a clear, prioritized roadmap on exactly which roles to apply for, which roles to use as backups, and which roles to strictly avoid.",
        body_style
    ))

    # Categorization Matrix Table
    story.append(Spacer(1, 6))
    story.append(Paragraph("2. Master Categorization of Notice Board Listings", h1_style))
    
    cat_data = [
        [
            Paragraph("Category", table_header),
            Paragraph("Relevance to CSE (AI/ML)", table_header),
            Paragraph("Roles Listed in Images", table_header),
            Paragraph("Recommended Action", table_header)
        ],
        [
            Paragraph("<b>Tier 1: AI & ML Core</b>", badge_green),
            Paragraph("Direct fit for your degree. High growth & salary potential.", table_body),
            Paragraph("• AI & Machine Learning<br/>• Artificial Intelligence - IT<br/>• AI Developer<br/>• Data Scientist<br/>• IT Data Analyst / Data Science", table_body),
            Paragraph("<b>TOP PRIORITY</b><br/>Apply First & Focus Prep Here", table_body)
        ],
        [
            Paragraph("<b>Tier 2: Core Software & Cloud</b>", badge_green),
            Paragraph("Strong technical foundation. Easy transition to MLOps/AI later.", table_body),
            Paragraph("• Python Developer<br/>• Full Stack / Java Full Stack<br/>• AWS DevOps / Cloud<br/>• Java / J2EE / .NET Developer<br/>• Cyber Security Specialist", table_body),
            Paragraph("<b>HIGH PRIORITY</b><br/>Excellent Technical Backups", table_body)
        ],
        [
            Paragraph("<b>Tier 3: Stepping Stones</b>", ParagraphStyle('Amber', parent=body_style, fontName='Helvetica-Bold', fontSize=8.5, textColor=amber_color)),
            Paragraph("Acceptable only if Tier 1/2 are unavailable.", table_body),
            Paragraph("• Automation Testing (QA)<br/>• UI/UX & Web Developer<br/>• IT Trainee / Tech Support", table_body),
            Paragraph("<b>CONDITIONAL</b><br/>Accept only for short-term entry", table_body)
        ],
        [
            Paragraph("<b>Tier 4: STRICT NO-GO</b>", badge_red),
            Paragraph("Zero technical growth. Career dead-end for an AI/ML engineer.", table_body),
            Paragraph("• BPO / ITES / Call Center<br/>• Sales / Business Dev (BDA)<br/>• Store Exec / Cashier / Admin<br/>• Civil / Mechanical / Pharma", table_body),
            Paragraph("<b>STRICTLY REJECT</b><br/>Do NOT Apply / Waste of Degree", table_body)
        ]
    ]

    t_cat = Table(cat_data, colWidths=[1.3*inch, 1.6*inch, 2.4*inch, 1.8*inch])
    t_cat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_cat)

    # Detailed Analysis of Top Companies & Roles
    story.append(Spacer(1, 10))
    story.append(Paragraph("3. Detailed Analysis of Specific Companies & Roles from Your Campus Drive", h1_style))

    # Tier 1 Roles
    story.append(Paragraph("A. TOP TIER ROLES (Directly Aligned with AI & ML)", h2_style))
    
    top_roles_data = [
        [
            Paragraph("Company Name", table_header),
            Paragraph("Exact Role Designation", table_header),
            Paragraph("Salary Range", table_header),
            Paragraph("Why You Should Target This Role", table_header)
        ],
        [
            Paragraph("<b>KEJ IT Solutions Pvt Ltd</b>", table_body),
            Paragraph("• Artificial Intelligence - IT<br/>• AI & ML<br/>• IT Data Analytics", table_body),
            Paragraph("20K to 58K / month", table_body),
            Paragraph("<b>Ideal AI Role:</b> Work directly with AI models, algorithms, machine learning pipelines, and data analytics.", table_body)
        ],
        [
            Paragraph("<b>Nirmaan ORG</b>", table_body),
            Paragraph("• AI Developer<br/>• Internship (Tech)", table_body),
            Paragraph("20K to 58K / month", table_body),
            Paragraph("<b>Core AI Development:</b> Building machine learning models and intelligent automation.", table_body)
        ],
        [
            Paragraph("<b>Vidwath Innovative Solutions</b>", table_body),
            Paragraph("• IT - AI ML<br/>• IT Data Analyst", table_body),
            Paragraph("20K to 60K / month", table_body),
            Paragraph("<b>Data & AI Focus:</b> Good exposure to feature engineering, statistical modeling, and data pipelines.", table_body)
        ],
        [
            Paragraph("<b>Anudip Pvt Ltd / KR Puram</b>", table_body),
            Paragraph("• AI ML<br/>• IT Data Analyst<br/>• IT - Data Science", table_body),
            Paragraph("20K to 58K / month", table_body),
            Paragraph("<b>Data Science Path:</b> Excellent for entering AI research, predictive modeling, and analytics.", table_body)
        ],
        [
            Paragraph("<b>NUAGE COMPUSYS</b>", table_body),
            Paragraph("• Data Scientist<br/>• Data Analyst", table_body),
            Paragraph("20K to 58K / month", table_body),
            Paragraph("<b>Data Science Core:</b> Involves Python, SQL, data modeling, visualization, and machine learning.", table_body)
        ],
        [
            Paragraph("<b>Dr Reddy's (Grow Plus)</b>", table_body),
            Paragraph("• IT - Data Science", table_body),
            Paragraph("20K to 58K / month", table_body),
            Paragraph("<b>Enterprise Data Science:</b> Applying AI/ML models to real-world healthcare & business datasets.", table_body)
        ]
    ]

    t_top = Table(top_roles_data, colWidths=[1.6*inch, 1.8*inch, 1.2*inch, 2.5*inch])
    t_top.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), accent_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_top)

    # Tier 2 Roles
    story.append(Spacer(1, 8))
    story.append(Paragraph("B. SECOND TIER ROLES (Core Software & Cloud Engineering)", h2_style))

    software_roles_data = [
        [
            Paragraph("Company Name", table_header),
            Paragraph("Designations", table_header),
            Paragraph("Salary", table_header),
            Paragraph("Technical Value for AI/ML Graduate", table_header)
        ],
        [
            Paragraph("<b>Wonksnow Technologies</b>", table_body),
            Paragraph("• Python Developer<br/>• Python Instructor Developer", table_body),
            Paragraph("19K to 60K", table_body),
            Paragraph("<b>Essential AI Language:</b> Python is the backbone of AI/ML. Building software in Python builds solid programming fundamentals.", table_body)
        ],
        [
            Paragraph("<b>Mapple Techno Service</b>", table_body),
            Paragraph("• Python Developer<br/>• Full Stack Developer<br/>• IT DevOps/AWS/Azure", table_body),
            Paragraph("20K to 60K", table_body),
            Paragraph("<b>Modern Tech Stack:</b> Combines Python backend, full stack web apps, and cloud deployment (MLOps prerequisite).", table_body)
        ],
        [
            Paragraph("<b>Interrival Tech Services</b>", table_body),
            Paragraph("• AWS DevOps<br/>• Full Stack Developer<br/>• Java Developer", table_body),
            Paragraph("20K to 60K", table_body),
            Paragraph("<b>Cloud & Full Stack:</b> Learning AWS/DevOps is crucial because AI models need cloud hosting and REST APIs.", table_body)
        ],
        [
            Paragraph("<b>Tata Strive / Highsource</b>", table_body),
            Paragraph("• Full Stack Developer<br/>• IT Cyber Security", table_body),
            Paragraph("20K to 60K", table_body),
            Paragraph("<b>Reputable Brands:</b> Strong training programs and solid resume value for freshers.", table_body)
        ]
    ]

    t_soft = Table(software_roles_data, colWidths=[1.6*inch, 1.8*inch, 1.0*inch, 2.7*inch])
    t_soft.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_soft)

    # Roles to Avoid
    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Roles You Must STRICTLY AVOID & Why", h1_style))
    story.append(Paragraph("Many listings on the notice board are non-technical or low-skill operations jobs. Do not fall into the trap of accepting these just to get a job offer:", body_style))

    avoid_data = [
        [
            Paragraph("Role Category", table_header),
            Paragraph("Companies Offering These", table_header),
            Paragraph("Why You Must Avoid (Risks)", table_header)
        ],
        [
            Paragraph("<b>BPO / ITES / Call Center / Voice / Non-Voice / Chat Process</b>", badge_red),
            Paragraph("Optizenmith, YG Connect, Diensten Tech, Quess Corp, Sunbiz, Hitachi Cash", table_body),
            Paragraph("<b>No Tech Skills:</b> Answering customer calls/emails. Zero coding, zero AI. After 1 year in BPO, switching to AI/software engineering is extremely difficult.", table_body)
        ],
        [
            Paragraph("<b>Sales / Business Development (BDA) / Marketing Exe</b>", badge_red),
            Paragraph("Bajaj Capital, Shriram Finance, Srikara Builders, Hope Givers, TeamRed", table_body),
            Paragraph("<b>Non-Technical Target Job:</b> Cold calling, selling financial products or real estate. Completely irrelevant to computer science.", table_body)
        ],
        [
            Paragraph("<b>Store Exe / Cashier / Front Office / Admin / Data Entry</b>", badge_red),
            Paragraph("LG Electronics, Cafe Coffee Day, Apollo Pharmacy, Olive Corporate, HDFC Life", table_body),
            Paragraph("<b>Clerical & Retail Work:</b> Basic computer operation and retail management. Waste of 4 years of engineering education.", table_body)
        ],
        [
            Paragraph("<b>Core Non-Tech Engg (Civil / Mechanical / Pharma)</b>", badge_red),
            Paragraph("Whiteboard, Glory Infinity, VFM Honda, Prerana Motors, B-Able Foundation", table_body),
            Paragraph("<b>Wrong Discipline:</b> Meant for Civil/Mechanical/Pharma graduates, not for CSE (AI/ML) students.", table_body)
        ]
    ]

    t_avoid = Table(avoid_data, colWidths=[1.8*inch, 2.0*inch, 3.3*inch])
    t_avoid.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), red_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_avoid)

    # 4th Year Action Plan
    story.append(Spacer(1, 10))
    story.append(Paragraph("5. Step-by-Step Strategy for Your 4th Year (Sem 7 & Sem 8)", h1_style))
    
    story.append(Paragraph("<b>Phase 1: Immediate Preparation (Semester 7 - Next 60 Days)</b>", h2_style))
    story.append(Paragraph("<b>1. Technical Skill Blueprint for AI/ML & Python Roles:</b>", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>Core Language:</b> Master Python (Data Structures, OOPs, List Comprehesions, Generators, Exception handling).", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>Data & ML Libraries:</b> NumPy, Pandas, Scikit-Learn, Matplotlib, Seaborn.", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>SQL & Databases:</b> Complex queries, Joins, GroupBy, Indexing (Essential for Data Analyst & Data Science interviews).", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>AI / LLM Basics:</b> Learn Prompt Engineering, LangChain/LlamaIndex, and OpenAI/Ollama API basics to stand out.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>2. Build 3 Portfolio Projects on GitHub:</b>", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <i>Project 1 (AI/ML):</i> End-to-End Predictive Model (e.g. House Price / Customer Churn Prediction) deployed with Streamlit.", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <i>Project 2 (Gen AI / NLP):</i> Smart PDF / Document Q&A RAG Chatbot using Python + FastAPI + Vector DB (Faiss/Chroma).", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <i>Project 3 (Full Stack / Cloud):</i> REST API with Python FastAPI/Flask integrated with React frontend hosted on AWS/Vercel.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Phase 2: Campus Drive Application Rules (Semester 7 & 8)</b>", h2_style))
    story.append(Paragraph("• <b>First Round Choice:</b> Apply ONLY to companies offering <i>AI Developer, AI & ML, Data Scientist, IT Data Analyst, Python Developer, Full Stack Developer, AWS DevOps</i>.", bullet_style))
    story.append(Paragraph("• <b>Second Round (Backup):</b> If you don't get an offer in Tier 1/2 after 3-4 drives, consider <i>Automation Testing (QA)</i> or <i>UI/UX Developer</i>.", bullet_style))
    story.append(Paragraph("• <b>Off-Campus Parallel Effort:</b> Don't rely 100% on campus drives! Apply on LinkedIn, Instahyre, Wellfound (AngelList), and Naukri for <i>Junior Python Developer / Data Science Intern</i> roles.", bullet_style))
    story.append(Paragraph("• <b>Internship to PPO Target:</b> Treat your 8th semester internship with 100% dedication to convert it into a Full-Time Offer (PPO).", bullet_style))

    # Summary Checklist
    story.append(Spacer(1, 10))
    story.append(Paragraph("6. Quick Checklist Before Applying to Any Job Drive", h1_style))
    
    chk_data = [
        [Paragraph("Question to Ask Yourself", table_header), Paragraph("If Answer is YES", table_header), Paragraph("If Answer is NO", table_header)],
        [
            Paragraph("Does the role involve Python, AI, Machine Learning, Data, or Software Coding?", table_body),
            Paragraph("<b>APPLY IMMEDIATELY (Top Priority)</b>", badge_green),
            Paragraph("Proceed to next question", table_body)
        ],
        [
            Paragraph("Is it Full Stack, Web Dev, Java, .NET, or Cloud/DevOps?", table_body),
            Paragraph("<b>APPLY AS STRONG BACKUP</b>", badge_green),
            Paragraph("Proceed to next question", table_body)
        ],
        [
            Paragraph("Is it Automation Testing (QA) or Technical Support?", table_body),
            Paragraph("<b>CONSIDER ONLY AS SHORT-TERM STEPPING STONE</b>", ParagraphStyle('Amb', parent=body_style, fontName='Helvetica-Bold', fontSize=8, textColor=amber_color)),
            Paragraph("Proceed to next question", table_body)
        ],
        [
            Paragraph("Is it BPO, Call Center, Sales/BDA, Store Exec, or Non-Tech?", table_body),
            Paragraph("<b>REJECT IMMEDIATELY (Do NOT Apply)</b>", badge_red),
            Paragraph("N/A", table_body)
        ]
    ]

    t_chk = Table(chk_data, colWidths=[3.2*inch, 2.0*inch, 1.9*inch])
    t_chk.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_chk)

    # Final Encouragement box
    story.append(Spacer(1, 12))
    enc_data = [[
        Paragraph(
            "<b>FINAL ADVICE FOR YOUR CAREER:</b><br/>"
            "You are in your 4th year studying <b>Artificial Intelligence & Machine Learning</b> — one of the most high-demand engineering fields in the world today. Do not panic seeing mixed job lists. Focus your energy on <b>Python, Data Structures, SQL, and 2-3 solid AI projects</b>. Target Tier 1 & Tier 2 roles relentlessly. Your degree gives you a huge advantage — use it wisely!",
            ParagraphStyle('EncText', parent=body_style, fontSize=9, leading=13, textColor=primary_color)
        )
    ]]
    t_enc = Table(enc_data, colWidths=[7.1*inch])
    t_enc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")), # Light blue tint
        ('BOX', (0,0), (-1,-1), 1, accent_color),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_enc)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully at {filename}")

if __name__ == '__main__':
    out_path = sys.argv[1] if len(sys.argv) > 1 else "CSE_AIML_Career_Guide_and_Job_Analysis.pdf"
    create_pdf(out_path)
