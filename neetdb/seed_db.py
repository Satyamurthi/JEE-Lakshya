import sqlite3
import os

def seed_database():
    db_dir = os.path.dirname(__file__)
    db_path = os.path.join(db_dir, "neet_questions.db")
    schema_path = os.path.join(db_dir, "schema.sql")

    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    with open(schema_path, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())

    # 1. Insert Subjects
    subjects = ["Physics", "Chemistry", "Botany", "Zoology"]
    subject_ids = {}
    for sub in subjects:
        cursor.execute("INSERT INTO subjects (name) VALUES (?);", (sub,))
        subject_ids[sub] = cursor.lastrowid

    # 2. Insert Years / Exams (8 Years: 2017 to 2024)
    years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]
    exam_ids = {}
    for yr in years:
        cursor.execute(
            "INSERT INTO exams (name, year, type, duration_minutes, total_questions) VALUES (?, ?, 'NEET', 180, 180);",
            (f"NEET UG {yr}", yr)
        )
        exam_ids[yr] = cursor.lastrowid

    # 3. Sample Chapters & Questions per subject
    raw_question_bank = [
        # BOTANY
        {
            "subject": "Botany",
            "chapter": "Photosynthesis in Higher Plants",
            "text": "Which pigment acts as the primary reaction center in Photosystem I (PSI) during light reaction of photosynthesis?",
            "options": [("Chlorophyll a P-700", True), ("Chlorophyll a P-680", False), ("Chlorophyll b", False), ("Carotenoids", False)],
            "explanation": "P-700 is the reaction center of Photosystem I with peak absorption at 700 nm wavelength.",
            "years": [2024, 2022, 2020, 2018]
        },
        {
            "subject": "Botany",
            "chapter": "Molecular Basis of Inheritance",
            "text": "If a double-stranded plant DNA contains 20% Cytosine, what is the expected percentage of Adenine according to Chargaff's rule?",
            "options": [("20%", False), ("30%", True), ("40%", False), ("60%", False)],
            "explanation": "According to Chargaff's rule, %C = %G = 20%. Therefore, C + G = 40%, leaving 60% for A + T. Since %A = %T, Adenine is 30%.",
            "years": [2023, 2021, 2019, 2017]
        },
        {
            "subject": "Botany",
            "chapter": "Plant Kingdom",
            "text": "Floridean starch has structure very similar to amylopectin and glycogen. It is the characteristic storage food material in:",
            "options": [("Rhodophyceae (Red algae)", True), ("Chlorophyceae (Green algae)", False), ("Phaeophyceae (Brown algae)", False), ("Cyanophyceae", False)],
            "explanation": "Floridean starch is stored as food reserve in red algae (Rhodophyceae).",
            "years": [2024, 2023, 2021, 2018]
        },
        {
            "subject": "Botany",
            "chapter": "Sexual Reproduction in Flowering Plants",
            "text": "What is the ploidy level of the Endosperm in angiosperms formed after double fertilization?",
            "options": [("Triploid (3n)", True), ("Diploid (2n)", False), ("Haploid (n)", False), ("Tetraploid (4n)", False)],
            "explanation": "Triple fusion of one haploid male gamete with two polar nuclei results in a triploid (3n) primary endosperm nucleus.",
            "years": [2022, 2020, 2019, 2017]
        },

        # ZOOLOGY
        {
            "subject": "Zoology",
            "chapter": "Human Reproduction",
            "text": "Which hormone surge triggers the rupture of Graafian follicle and induces ovulation in human females?",
            "options": [("Luteinizing Hormone (LH)", True), ("Follicle Stimulating Hormone (FSH)", False), ("Estrogen", False), ("Progesterone", False)],
            "explanation": "Rapid secretion of LH leading to maximum level during mid-cycle (LH surge) induces rupture of Graafian follicle and ovulation.",
            "years": [2024, 2022, 2021, 2019]
        },
        {
            "subject": "Zoology",
            "chapter": "Human Physiology: Breathing & Exchange",
            "text": "Tidal Volume and Expiratory Reserve Volume of an athlete are 500 mL and 1000 mL respectively. What will be his Expiratory Capacity?",
            "options": [("1500 mL", True), ("2000 mL", False), ("2500 mL", False), ("1000 mL", False)],
            "explanation": "Expiratory Capacity (EC) = Tidal Volume (TV) + Expiratory Reserve Volume (ERV) = 500 mL + 1000 mL = 1500 mL.",
            "years": [2023, 2020, 2018, 2017]
        },
        {
            "subject": "Zoology",
            "chapter": "Animal Kingdom",
            "text": "Radial symmetry is observed in organisms belonging to which of the following phyla?",
            "options": [("Echinodermata and Coelenterata", True), ("Arthropoda and Annelida", False), ("Mollusca and Porifera", False), ("Platyhelminthes and Aschelminthes", False)],
            "explanation": "Coelenterates, Ctenophores, and adult Echinoderms exhibit radial body symmetry.",
            "years": [2024, 2023, 2022, 2018]
        },
        {
            "subject": "Zoology",
            "chapter": "Biotechnology & Applications",
            "text": "Bt cotton variety that has been developed by the introduction of toxin gene is resistant to:",
            "options": [("Insect pests (Bollworms)", True), ("Fungal diseases", False), ("Plant nematodes", False), ("Bacterial pathogens", False)],
            "explanation": "The cry gene from Bacillus thuringiensis produces endotoxin crystals toxic to specific insect pests like cotton bollworms.",
            "years": [2021, 2020, 2019, 2017]
        },

        # CHEMISTRY
        {
            "subject": "Chemistry",
            "chapter": "Chemical Bonding",
            "text": "What is the molecular geometry and hybridization of the Central Xenon Atom in XeF4?",
            "options": [("Square Planar, sp3d2", True), ("Tetrahedral, sp3", False), ("Square Pyramidal, sp3d", False), ("Octahedral, sp3d2", False)],
            "explanation": "Xe has 8 valence electrons. In XeF4, it forms 4 single bonds with 2 lone pairs. Steric number is 6, giving sp3d2 hybridization and square planar shape.",
            "years": [2024, 2022, 2020, 2018]
        },
        {
            "subject": "Chemistry",
            "chapter": "Solutions",
            "text": "Which of the following colligative properties is most suitable for determining the molar mass of biopolymers like proteins?",
            "options": [("Osmotic Pressure", True), ("Relative lowering of vapor pressure", False), ("Elevation of boiling point", False), ("Depression of freezing point", False)],
            "explanation": "Osmotic pressure measurements are carried out around room temperature and molarities are used instead of molalities, making it ideal for biomolecules.",
            "years": [2023, 2021, 2019, 2017]
        },
        {
            "subject": "Chemistry",
            "chapter": "Organic Chemistry Basics",
            "text": "Which electrophile is responsible for nitration of benzene in presence of concentrated HNO3 and H2SO4 mixture?",
            "options": [("Nitronium ion (NO2+)", True), ("Nitrosonium ion (NO+)", False), ("Nitrate ion (NO3-)", False), ("Nitrite ion (NO2-)", False)],
            "explanation": "Protonation of HNO3 by sulfuric acid generates the nitronium ion (NO2+), which acts as the active electrophile.",
            "years": [2024, 2023, 2022, 2019]
        },

        # PHYSICS
        {
            "subject": "Physics",
            "chapter": "Semiconductor Electronics",
            "text": "Under forward bias condition in a p-n junction diode, the width of the depletion region:",
            "options": [("Decreases", True), ("Increases", False), ("Remains constant", False), ("First increases then decreases", False)],
            "explanation": "Forward biasing opposes the internal barrier potential, reducing the height of the potential barrier and narrowing the depletion width.",
            "years": [2024, 2022, 2020, 2018]
        },
        {
            "subject": "Physics",
            "chapter": "Optics",
            "text": "A convex lens of focal length 20 cm is placed in contact with a concave lens of focal length 25 cm. What is the power of the combination?",
            "options": [("+1.0 D", True), ("-1.0 D", False), ("+9.0 D", False), ("-9.0 D", False)],
            "explanation": "P = P1 + P2 = (100/20) + (100/-25) = +5 - 4 = +1.0 Diopter.",
            "years": [2023, 2021, 2019, 2017]
        },
        {
            "subject": "Physics",
            "chapter": "Electrostatics",
            "text": "The electric flux through a closed Gaussian surface enclosing an electric dipole of charge +q and -q is equal to:",
            "options": [("Zero", True), ("q/ε0", False), ("2q/ε0", False), ("q/2ε0", False)],
            "explanation": "By Gauss's Law, total electric flux = net enclosed charge / ε0. For a dipole, net enclosed charge (+q - q) = 0, so flux is zero.",
            "years": [2024, 2023, 2021, 2018]
        }
    ]

    chapter_ids = {}

    total_inserted = 0
    for q_data in raw_question_bank:
        sub_name = q_data["subject"]
        sub_id = subject_ids[sub_name]
        chap_name = q_data["chapter"]

        chap_key = (sub_id, chap_name)
        if chap_key not in chapter_ids:
            cursor.execute("INSERT INTO chapters (subject_id, name) VALUES (?, ?);", (sub_id, chap_name))
            chapter_ids[chap_key] = cursor.lastrowid
        chap_id = chapter_ids[chap_key]

        # Insert question for each designated year
        for yr in q_data["years"]:
            e_id = exam_ids[yr]
            cursor.execute(
                """INSERT INTO questions 
                   (exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect)
                   VALUES (?, ?, ?, ?, 'MCQ', 'Medium', 4, -1);""",
                (e_id, sub_id, chap_id, f"[{yr}] " + q_data["text"])
            )
            q_id = cursor.lastrowid
            total_inserted += 1

            for opt_text, is_corr in q_data["options"]:
                cursor.execute(
                    "INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?);",
                    (q_id, opt_text, 1 if is_corr else 0)
                )

            cursor.execute(
                "INSERT INTO solutions (question_id, explanation_text) VALUES (?, ?);",
                (q_id, q_data["explanation"])
            )

    conn.commit()
    conn.close()
    print(f"[SUCCESS] Successfully created neet_questions.db with {len(years)} Year-wise papers and inserted {total_inserted} NEET questions!")

if __name__ == "__main__":
    seed_database()
