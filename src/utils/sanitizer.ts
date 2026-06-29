/**
 * Question & Math Sanitizer Utility
 * Cleans up raw text, decodes HTML entities, strips internal tags like [JEE Hard #123],
 * and fixes KaTeX formatting errors.
 */

const PUA_MAP: Record<string, string> = {
  '\uf02d': '-',
  '\uf02b': '+',
  '\uf03d': '=',
  '\uf03c': '<',
  '\uf03e': '>',
  '\uf0b3': '≥',
  '\uf0a3': '≤',
  '\uf0b9': '≠',
  '\uf0ce': '∈',
  '\uf0cd': '∉',
  '\uf0c8': '∪',
  '\uf0c7': '∩',
  '\uf0ae': '→',
  '\uf0be': '→',
  '\uf0de': '→',
  '\uf0b4': '×',
  '\uf0d7': '⋅',
  '\uf0b7': '⋅',
  '\uf0b0': '°',
  '\uf0b1': '±',
  '\uf020': ' ',
  '\uf028': '(',
  '\uf029': ')',
  '\uf05b': '[',
  '\uf05d': ']',
  '\uf07b': '{',
  '\uf07d': '}',
  '\uf0f2': '∫',
  '\uf0e5': '∑',
  '\uf061': 'α',
  '\uf062': 'β',
  '\uf067': 'γ',
  '\uf064': 'δ',
  '\uf065': 'ε',
  '\uf066': 'φ',
  '\uf068': 'η',
  '\uf06c': 'λ',
  '\uf06d': 'μ',
  '\uf06e': 'ν',
  '\uf070': 'π',
  '\uf071': 'θ',
  '\uf072': 'ρ',
  '\uf073': 'σ',
  '\uf077': 'ω',
  '\uf049': 'I',
  '\uf04c': 'Λ',
  '\uf0a5': '∞',
  '\uf0bc': '⋅',
  '\uf0ba': '≡',
};

export const cleanQuestionText = (text: string): string => {
  if (!text) return '';

  let cleaned = text;

  // 1. Strip internal identification tags like [JEE Hard #771], [NEET Medium #3015], [#507]
  cleaned = cleaned.replace(/\[\s*(JEE|NEET|KCET|UPSC)?\s*(Hard|Medium|Easy|Advanced|Main)?\s*#\d+\s*\]/gi, '');
  cleaned = cleaned.replace(/\[\s*#\d+\s*\]/gi, '');

  // 2. Decode common HTML entities that break math rendering
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 3. Clean up bad HTML breaks inside or outside math blocks
  cleaned = cleaned.replace(/<\s*br\s*\/?>/gi, ' ');

  // 4. Replace Private Use Area (PUA) font glyphs from PDF extraction
  cleaned = cleaned.replace(/[\uf000-\uf0ff]/g, (char) => PUA_MAP[char] || '');

  // 5. Clean up corrupted greatest integer notation artifacts like [ ]≡ or [ ]⋅
  cleaned = cleaned.replace(/\[\s*\]\s*≡/g, '[·]').replace(/\[\s*\]\s*⋅/g, '[·]');

  // 6. Clean up KaTeX formatting issues (e.g. {\rho _{oil}} formatting)
  cleaned = cleaned.replace(/\{\s*\\rho\s*_\{([^}]+)\}\s*\}/g, '\\rho_{$1}');

  return cleaned.trim();
};

