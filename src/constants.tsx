

import { Brain, Target, History, Settings, ChevronRight, LayoutGrid, BookOpen, Clock, Activity, Award, User, LogOut, Flame, CalendarClock, Sliders, Crown } from 'lucide-react';

export const APP_NAME = "Lakshya";

export const SUBJECTS_CONFIG = {
  Physics: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  Chemistry: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  Mathematics: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  Biology: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Botany: { color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  Zoology: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' }
};

export const NCERT_CHAPTERS = {
  Physics: [
    { name: "Units and Measurements", topics: ["Dimensions", "Errors in Measurement", "Significant Figures"] },
    { name: "Kinematics", topics: ["Motion in a Straight Line", "Vectors", "Projectile Motion", "Relative Velocity"] },
    { name: "Laws of Motion", topics: ["Newton's Laws", "Friction", "Circular Motion"] },
    { name: "Work, Energy and Power", topics: ["Work-Energy Theorem", "Potential Energy", "Collisions"] },
    { name: "Rotational Motion", topics: ["Moment of Inertia", "Torque", "Angular Momentum", "Rolling Motion"] },
    { name: "Gravitation", topics: ["Kepler's Laws", "Gravitational Field", "Escape Velocity", "Satellite Motion"] },
    { name: "Thermodynamics", topics: ["Laws of Thermodynamics", "Heat Engines", "Carnot Cycle"] },
    { name: "Kinetic Theory", topics: ["Ideal Gas Equation", "Maxwell's Distribution", "Degrees of Freedom"] },
    { name: "Oscillations", topics: ["Simple Harmonic Motion", "Damped Oscillations", "Forced Oscillations"] },
    { name: "Waves", topics: ["Wave Equation", "Superposition", "Doppler Effect", "Standing Waves"] },
    { name: "Electrostatics", topics: ["Coulomb's Law", "Electric Field", "Gauss's Law", "Capacitors"] },
    { name: "Current Electricity", topics: ["Ohm's Law", "Kirchhoff's Laws", "Potentiometer"] },
    { name: "Magnetism", topics: ["Biot-Savart Law", "Ampere's Law", "Magnetic Force", "Earth's Magnetism"] },
    { name: "Optics", topics: ["Reflection & Refraction", "Interference", "Diffraction", "Polarization"] },
    { name: "Modern Physics", topics: ["Photoelectric Effect", "Bohr's Model", "Nuclei", "Semiconductors"] }
  ],
  Chemistry: [
    { name: "Basic Concepts", topics: ["Mole Concept", "Stoichiometry", "Concentration Terms"] },
    { name: "Structure of Atom", topics: ["Quantum Numbers", "Bohr's Model", "Heisenberg's Principle", "Aufbau Principle"] },
    { name: "Classification of Elements", topics: ["Periodic Trends", "Ionization Enthalpy", "Electron Gain Enthalpy"] },
    { name: "Chemical Bonding", topics: ["VSEPR Theory", "Hybridization", "Molecular Orbital Theory"] },
    { name: "States of Matter", topics: ["Gas Laws", "van der Waals Equation", "Liquid State"] },
    { name: "Thermodynamics", topics: ["Enthalpy", "Entropy", "Gibbs Free Energy"] },
    { name: "Equilibrium", topics: ["Le Chatelier's Principle", "pH and Buffers", "Solubility Product"] },
    { name: "Redox Reactions", topics: ["Oxidation Number", "Balancing Redox Reactions"] },
    { name: "Organic Chemistry Basics", topics: ["Nomenclature", "Isomerism", "Electronic Effects"] },
    { name: "Hydrocarbons", topics: ["Alkanes", "Alkenes", "Alkynes", "Aromatic Hydrocarbons"] },
    { name: "Solutions", topics: ["Colligative Properties", "Raoult's Law", "van't Hoff Factor"] },
    { name: "Electrochemistry", topics: ["Nernst Equation", "Electrolytic Cells", "Conductance"] },
    { name: "Chemical Kinetics", topics: ["Rate Law", "Arrhenius Equation", "First-Order Reactions"] },
    { name: "Coordination Compounds", topics: ["Werner's Theory", "Crystal Field Theory", "Isomerism in Coordination Compounds"] }
  ],
  Biology: [
    { name: "Diversity in the Living World", topics: ["The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom"] },
    { name: "Structural Organisation in Plants and Animals", topics: ["Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals"] },
    { name: "Cell: Structure and Functions", topics: ["Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division"] },
    { name: "Plant Physiology", topics: ["Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development"] },
    { name: "Human Physiology", topics: ["Breathing and Exchange of Gases", "Body Fluids and Circulation", "Excretory Products", "Locomotion and Movement", "Neural Control", "Chemical Coordination"] },
    { name: "Reproduction", topics: ["Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health"] },
    { name: "Genetics and Evolution", topics: ["Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution"] },
    { name: "Biology in Human Welfare", topics: ["Human Health and Disease", "Microbes in Human Welfare"] },
    { name: "Biotechnology", topics: ["Biotechnology: Principles and Processes", "Biotechnology and its Applications"] },
    { name: "Ecology and Environment", topics: ["Organisms and Populations", "Ecosystem", "Biodiversity and Conservation"] }
  ],
  Botany: [
    { name: "Plant Kingdom", topics: ["Algae", "Bryophytes", "Pteridophytes", "Gymnosperms", "Angiosperms"] },
    { name: "Plant Physiology", topics: ["Mineral Nutrition", "Transport in Plants"] },
    { name: "Photosynthesis in Higher Plants", topics: ["Light Reactions", "Calvin Cycle", "C4 Pathway", "Photorespiration"] },
    { name: "Respiration in Plants", topics: ["Glycolysis", "Krebs Cycle", "Electron Transport Scheme"] },
    { name: "Plant Growth and Development", topics: ["Auxins", "Gibberellins", "Cytokinins", "Ethylene", "Abscisic Acid"] },
    { name: "Sexual Reproduction in Flowering Plants", topics: ["Microsporogenesis", "Megasporogenesis", "Double Fertilization", "Apomixis"] },
    { name: "Principles of Inheritance", topics: ["Mendelian Inheritance", "Post-Mendelian Genetics", "Linkage and Recombination"] },
    { name: "Molecular Basis of Inheritance", topics: ["DNA Replication", "Transcription", "Translation", "Genetic Code", "Operon Concept"] },
    { name: "Ecology and Ecosystems", topics: ["Ecosystem Structure", "Energy Flow", "Ecological Pyramids", "Nutrient Cycles"] }
  ],
  Zoology: [
    { name: "Animal Kingdom", topics: ["Non-Chordates", "Chordates", "Coelenterates", "Arthropods"] },
    { name: "Structural Organisation in Animals", topics: ["Animal Tissues", "Cockroach Anatomy", "Frog Anatomy"] },
    { name: "Cell Biology", topics: ["Cell Organelles", "Mitosis", "Meiosis", "Biomolecules"] },
    { name: "Human Physiology: Digestion & Breathing", topics: ["Digestion", "Absorption", "Breathing Mechanism", "Gas Transport"] },
    { name: "Human Physiology: Circulation & Excretion", topics: ["Cardiac Cycle", "ECG", "Nephron Structure", "Urine Formation"] },
    { name: "Human Physiology: Neural & Endocrine", topics: ["Nerve Impulse Transmission", "Reflex Action", "Hormones Action", "Pituitary Gland"] },
    { name: "Human Reproduction & Health", topics: ["Spermatogenesis", "Oogenesis", "Menstrual Cycle", "IVF & Assisted Reproduction"] },
    { name: "Evolution", topics: ["Origin of Life", "Darwinism", "Modern Synthetic Theory", "Human Evolution"] },
    { name: "Biotechnology & Applications", topics: ["Recombinant DNA Technology", "PCR", "Gene Therapy", "Transgenic Animals"] }
  ],
  Mathematics: [
    { name: "Sets and Functions", topics: ["Sets", "Relations", "Functions", "Types of Functions"] },
    { name: "Trigonometry", topics: ["Trigonometric Ratios", "Trigonometric Equations", "Inverse Trigonometry"] },
    { name: "Algebra", topics: ["Complex Numbers", "Quadratic Equations", "Matrices & Determinants"] },
    { name: "Permutations and Combinations", topics: ["Fundamental Principle of Counting", "Permutations", "Combinations"] },
    { name: "Binomial Theorem", topics: ["Binomial Expansion", "General Term", "Properties of Binomial Coefficients"] },
    { name: "Sequences and Series", topics: ["Arithmetic Progression", "Geometric Progression", "Harmonic Progression"] },
    { name: "Coordinate Geometry", topics: ["Straight Lines", "Circles", "Parabola", "Ellipse", "Hyperbola"] },
    { name: "Calculus (Limits, Derivatives)", topics: ["Limits & Continuity", "Methods of Differentiation", "Applications of Derivatives"] },
    { name: "Integration", topics: ["Indefinite Integration", "Definite Integration", "Area Under Curves"] },
    { name: "Differential Equations", topics: ["Order and Degree", "Methods of Solving", "Linear Differential Equations"] },
    { name: "Vectors and 3D Geometry", topics: ["Vectors", "Lines in 3D", "Planes in 3D"] },
    { name: "Probability", topics: ["Conditional Probability", "Bayes' Theorem", "Binomial Distribution"] }
  ]
};

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-5 h-5" />, path: '/' },
  { id: 'daily', label: 'Daily Challenge', icon: <CalendarClock className="w-5 h-5" />, path: '/daily' },
  { id: 'exam-setup', label: 'Full Exam', icon: <Target className="w-5 h-5" />, path: '/exam-setup' },
  { id: 'practice', label: 'Chapter Practice', icon: <BookOpen className="w-5 h-5" />, path: '/practice' },
  { id: 'pyqs', label: 'Year-Wise PYQs (2013-2026)', icon: <Award className="w-5 h-5" />, path: '/pyqs' },
  { id: 'pricing', label: 'Premium Plans', icon: <Crown className="w-5 h-5" />, path: '/pricing' },
  { id: 'history', label: 'History', icon: <History className="w-5 h-5" />, path: '/history' },
  { id: 'analysis', label: 'AI Analytics', icon: <Activity className="w-5 h-5" />, path: '/analytics' },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/settings' },
  { id: 'admin', label: 'Admin Panel', icon: <Sliders className="w-5 h-5" />, path: '/admin' },
  { id: 'super-admin', label: 'Super Admin', icon: <Crown className="w-5 h-5" />, path: '/super-admin' },
];
