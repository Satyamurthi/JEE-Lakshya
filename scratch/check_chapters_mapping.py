import re

ncert_chapters = {
  "Physics": [
    "Units and Measurements", "Kinematics", "Laws of Motion", "Work, Energy and Power", 
    "Rotational Motion", "Gravitation", "Thermodynamics", "Kinetic Theory", "Oscillations", 
    "Waves", "Electrostatics", "Current Electricity", "Magnetism", "Optics", "Modern Physics"
  ],
  "Chemistry": [
    "Basic Concepts", "Structure of Atom", "Classification of Elements", "Chemical Bonding", 
    "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Organic Chemistry Basics", 
    "Hydrocarbons", "Solutions", "Electrochemistry", "Chemical Kinetics", "Coordination Compounds"
  ],
  "Mathematics": [
    "Sets and Functions", "Trigonometry", "Algebra", "Permutations and Combinations", 
    "Binomial Theorem", "Sequences and Series", "Coordinate Geometry", "Calculus (Limits, Derivatives)", 
    "Integration", "Differential Equations", "Vectors and 3D Geometry", "Probability"
  ]
}

def find_mapping(weak_area_name):
    # Search in NCERT chapters first
    for sub, chaps in ncert_chapters.items():
        for ch in chaps:
            if ch.lower() in weak_area_name.lower() or weak_area_name.lower() in ch.lower():
                return sub, ch
    # Fallback keyword match
    w_lower = weak_area_name.lower()
    if any(k in w_lower for k in ["rotational", "motion", "kinematics", "physics", "optics", "wave", "electro", "current"]):
        return "Physics", weak_area_name
    elif any(k in w_lower for k in ["chem", "bond", "atom", "thermo", "organic", "hydrocarbon", "solution"]):
        return "Chemistry", weak_area_name
    elif any(k in w_lower for k in ["math", "complex", "calculus", "integration", "algebra", "trig", "vector"]):
        return "Mathematics", weak_area_name
    return "Physics", weak_area_name

print("Mapping tests:")
print("Rotational Dynamics ->", find_mapping("Rotational Dynamics"))
print("Complex Numbers ->", find_mapping("Complex Numbers"))
print("Chemical Thermodynamics ->", find_mapping("Chemical Thermodynamics"))
