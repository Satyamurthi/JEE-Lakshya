/**
 * Question & Math Sanitizer Utility — Complete Rewrite (Session 59)
 *
 * Preprocessing pipeline (order is critical):
 *   1. fixControlChars    — repair JS string corruption (\x0c, \x08 etc)
 *   2. PUA glyph map      — replace PDF Private-Use-Area font chars
 *   3. convertUnicode     — ALL Unicode math/Greek → TeX FIRST (before pattern matching)
 *   4. fixOCRMacros       — bare OCR words (frac, vec, sqrt, limits, greek) → \cmd
 *   5. fixTeXSyntax       — brace balance, \over→\frac, delimiter fixes
 *   6. cleanQuestionText  — strip HTML, junk, watermarks; applies full pipeline
 */

// === PUA glyph map ============================================================
const PUA_MAP: Record<string, string> = {
  '\uf02d': '-', '\uf02b': '+', '\uf03d': '=', '\uf03c': '<', '\uf03e': '>',
  '\uf0b3': '>=', '\uf0a3': '<=', '\uf0b9': '!=', '\uf0ce': '\\in ',
  '\uf0cd': '\\notin ', '\uf0c8': '\\cup ', '\uf0c7': '\\cap ',
  '\uf0ae': '\\rightarrow ', '\uf0be': '\\rightarrow ', '\uf0de': '\\rightarrow ',
  '\uf0b4': '\\times ', '\uf0d7': '\\cdot ', '\uf0b7': '\\cdot ',
  '\uf0b0': '^{\\circ}', '\uf0b1': '\\pm ', '\uf020': ' ',
  '\uf028': '(', '\uf029': ')', '\uf05b': '[', '\uf05d': ']',
  '\uf07b': '{', '\uf07d': '}', '\uf0f2': '\\int ', '\uf0e5': '\\sum ',
  '\uf061': '\\alpha ', '\uf062': '\\beta ', '\uf067': '\\gamma ',
  '\uf064': '\\delta ', '\uf065': '\\varepsilon ', '\uf066': '\\phi ',
  '\uf068': '\\eta ', '\uf06c': '\\lambda ', '\uf06d': '\\mu ',
  '\uf06e': '\\nu ', '\uf070': '\\pi ', '\uf071': '\\theta ',
  '\uf072': '\\rho ', '\uf073': '\\sigma ', '\uf077': '\\omega ',
  '\uf049': 'I', '\uf04c': '\\Lambda ', '\uf0a5': '\\infty ',
  '\uf0bc': '\\cdot ', '\uf0ba': '\\equiv ', '\uf0b5': '\\mu ',
  '\uf04e': 'N', '\uf052': 'R', '\uf04f': 'O',
  '\uf041': 'A', '\uf042': 'B', '\uf043': 'C', '\uf044': 'D',
  '\uf045': 'E', '\uf046': 'F', '\uf047': 'G', '\uf048': 'H',
};

// === Step 1: Fix JS control character corruptions =============================
export const fixControlChars = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\x0crac/g, '\\frac')
    .replace(/\x08eta/g, '\\beta')
    .replace(/\x08egin/g, '\\begin')
    .replace(/\x09heta/g, '\\theta')
    .replace(/\x09imes/g, '\\times')
    .replace(/\x09an/g, '\\tan')
    .replace(/\x09ext/g, '\\text')
    .replace(/\x09au/g, '\\tau')
    .replace(/\x0dight/g, '\\right')
    .replace(/\x0dho/g, '\\rho')
    .replace(/\x07lpha/g, '\\alpha')
    .replace(/\x0epsi/g, '\\psi');
};

// === Step 3: Convert ALL Unicode math/Greek to TeX ===========================
// MUST run before fixOCRMacros — pattern like frac([a-zA-Z]) won't match Δ
export const convertUnicode = (text: string): string => {
  if (!text) return '';
  return text
    // Greek lowercase
    .replace(/α/g, '\\alpha ').replace(/β/g, '\\beta ').replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ').replace(/ε/g, '\\varepsilon ').replace(/ζ/g, '\\zeta ')
    .replace(/η/g, '\\eta ').replace(/θ/g, '\\theta ').replace(/ι/g, '\\iota ')
    .replace(/κ/g, '\\kappa ').replace(/λ/g, '\\lambda ').replace(/μ/g, '\\mu ')
    .replace(/ν/g, '\\nu ').replace(/ξ/g, '\\xi ')
    .replace(/π/g, '\\pi ').replace(/ρ/g, '\\rho ').replace(/σ/g, '\\sigma ')
    .replace(/τ/g, '\\tau ').replace(/υ/g, '\\upsilon ').replace(/φ/g, '\\phi ')
    .replace(/χ/g, '\\chi ').replace(/ψ/g, '\\psi ').replace(/ω/g, '\\omega ')
    // Greek uppercase
    .replace(/Γ/g, '\\Gamma ').replace(/Δ/g, '\\Delta ').replace(/Θ/g, '\\Theta ')
    .replace(/Λ/g, '\\Lambda ').replace(/Ξ/g, '\\Xi ').replace(/Π/g, '\\Pi ')
    .replace(/Σ/g, '\\Sigma ').replace(/Υ/g, '\\Upsilon ').replace(/Φ/g, '\\Phi ')
    .replace(/Ψ/g, '\\Psi ').replace(/Ω/g, '\\Omega ')
    // Operators
    .replace(/×/g, '\\times ').replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\leq ').replace(/≥/g, '\\geq ')
    .replace(/≠/g, '\\neq ').replace(/≈/g, '\\approx ').replace(/≡/g, '\\equiv ')
    .replace(/∝/g, '\\propto ').replace(/∞/g, '\\infty ')
    .replace(/±/g, '\\pm ').replace(/∓/g, '\\mp ')
    .replace(/·/g, '\\cdot ').replace(/⋅/g, '\\cdot ').replace(/•/g, '\\bullet ')
    // Integrals (order: integral+limits BEFORE bare integral)
    .replace(/∫\s*limits\b/g, '\\int\\limits')
    .replace(/∫/g, '\\int ').replace(/∬/g, '\\iint ').replace(/∭/g, '\\iiint ')
    .replace(/∮/g, '\\oint ').replace(/∑/g, '\\sum ').replace(/∏/g, '\\prod ')
    .replace(/√/g, '\\sqrt ')
    // Arrows
    .replace(/→/g, '\\rightarrow ').replace(/←/g, '\\leftarrow ')
    .replace(/↔/g, '\\leftrightarrow ').replace(/↑/g, '\\uparrow ').replace(/↓/g, '\\downarrow ')
    .replace(/⇒/g, '\\Rightarrow ').replace(/⇔/g, '\\Leftrightarrow ').replace(/⇐/g, '\\Leftarrow ')
    // Set theory
    .replace(/∈/g, '\\in ').replace(/∉/g, '\\notin ')
    .replace(/⊂/g, '\\subset ').replace(/⊃/g, '\\supset ')
    .replace(/⊆/g, '\\subseteq ').replace(/⊇/g, '\\supseteq ')
    .replace(/∪/g, '\\cup ').replace(/∩/g, '\\cap ').replace(/∅/g, '\\emptyset ')
    // Calculus/logic
    .replace(/∂/g, '\\partial ').replace(/∇/g, '\\nabla ')
    .replace(/∀/g, '\\forall ').replace(/∃/g, '\\exists ')
    .replace(/∴/g, '\\Rightarrow ').replace(/∵/g, '\\because ')
    .replace(/⊥/g, '\\perp ').replace(/∥/g, '\\parallel ')
    .replace(/∠/g, '\\angle ')
    // Superscripts & fractions
    .replace(/°/g, '^{\\circ}')
    .replace(/²/g, '^{2}').replace(/³/g, '^{3}').replace(/¹/g, '^{1}')
    .replace(/½/g, '\\frac{1}{2}').replace(/⅓/g, '\\frac{1}{3}')
    .replace(/¼/g, '\\frac{1}{4}').replace(/¾/g, '\\frac{3}{4}');
};

// === Step 4: Convert bare OCR words to TeX ===================================
// Run AFTER convertUnicode so "fracΔ E" → "frac\Delta  E" → "\frac{\Delta }{E}"
export const fixOCRMacros = (text: string): string => {
  if (!text) return '';
  let m = text;

  // fracfrac (nested fractions — must come FIRST)
  m = m.replace(/(?<!\\)\bfracfrac\b/gi, '\\frac{\\frac');

  // frac with decimal numerator: frac1.89 X → \frac{1.89}{X}
  m = m.replace(/(?<!\\)\bfrac\s*([0-9]+[.,][0-9]+(?:[eE][+-]?[0-9]+)?)\s+([^\s\\{,)]+)/gi,
    '\\frac{$1}{$2}');

  // frac NUM 1 NUM (e.g. frac 3 1 4 → \frac{3}{4})
  m = m.replace(/(?<!\\)\bfrac\s+(\d+)\s+1\s+(\d+)\b/gi, '\\frac{$1}{$2}');
  m = m.replace(/(?<!\\)\bfrac\s+(\d+)\s+(\d+)\b/gi, '\\frac{$1}{$2}');

  // frac EXPR 1 EXPR — handles "frac v^2 1 r" → "\frac{v^2}{r}"
  m = m.replace(/(?<!\\)\bfrac\s+([\w\\^{}]+(?:\s*[\^_]\s*[\w{}]+)*)\s+1\s+([\w\\^{}]+)\b/gi,
    '\\frac{$1}{$2}');

  // frac EXPR EXPR — handles "frac dv dt" → "\frac{dv}{dt}"
  m = m.replace(/(?<!\\)\bfrac\s+([\w\\^{}]+)\s+([\w\\^{}]+)\b/gi, '\\frac{$1}{$2}');

  // fracEXPR 1 EXPR (no space) — handles "fracv^2 1 r"
  m = m.replace(/(?<!\\)\bfrac([a-zA-Z\\][a-zA-Z0-9\\^{}]*)\s+1\s+([a-zA-Z0-9\\^{}]+)\b/gi,
    '\\frac{$1}{$2}');

  // fracEXPR EXPR (no space) — handles "fracdt dr"
  m = m.replace(/(?<!\\)\bfrac([a-zA-Z\\][a-zA-Z0-9\\^{}]*)\s+([a-zA-Z0-9\\^{}]+)\b/gi,
    '\\frac{$1}{$2}');

  // frac - NUM EXPR — handles "frac - 1 v" → "\frac{-1}{v}"
  m = m.replace(/(?<!\\)\bfrac\s*-\s*(\d+)\s+([a-zA-Z0-9\\^{}]+)/gi, '\\frac{-$1}{$2}');

  // frac{ without backslash
  m = m.replace(/(?<!\\)\bfrac\s*\{/g, '\\frac{');

  // sqrt
  m = m.replace(/(?<!\\)\bsqrt\s*\{/g, '\\sqrt{');
  m = m.replace(/(?<!\\)\bsqrt\s+([0-9a-zA-Z]+)/g, '\\sqrt{$1}');

  // vec/hat/bar: veca → \vec{a}
  m = m.replace(/(?<!\\)\bvec([a-zA-Z])(?=[_^,.\s)}|$\[\]]|\]|$)/g, '\\vec{$1}');
  m = m.replace(/(?<!\\)\bhat([a-zA-Z])(?=[_^,.\s)}|$\[\]]|$)/g, '\\hat{$1}');
  m = m.replace(/(?<!\\)\bbar([a-zA-Z])(?=[_^,.\s)}|$\[\]]|$)/g, '\\bar{$1}');

  // Bare greek letter words (safe contexts — after _, ^, space, punctuation)
  const GREEK_LC = ['alpha','beta','gamma','delta','epsilon','varepsilon','zeta',
                    'eta','theta','iota','kappa','lambda','mu','nu','xi','pi',
                    'rho','sigma','tau','upsilon','phi','varphi','chi','psi','omega'];
  const GREEK_UC = ['Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Upsilon',
                    'Phi','Psi','Omega'];
  for (const g of [...GREEK_LC, ...GREEK_UC]) {
    m = m.replace(
      new RegExp(`(?<![a-zA-Z\\\\])\\b${g}\\b(?=[_^,.)\\]\\s]|$)`, 'g'),
      `\\${g} `
    );
  }

  // limits / ell
  m = m.replace(/(?<!\\)\blimits\b/g, '\\limits');
  m = m.replace(/(?<!\\)\bell\b/g, '\\ell');

  // left/right without backslash
  m = m.replace(/(?<!\\)\bleft\[/gi, '\\left[');
  m = m.replace(/(?<!\\)\bright\]/gi, '\\right]');
  m = m.replace(/(?<!\\)\bleft\(/gi, '\\left(');
  m = m.replace(/(?<!\\)\bright\)/gi, '\\right)');

  // OCR-corrupted \left/\right (\eft → \left, \ight → \right)
  m = m.replace(/\\eft\b/g, '\\left');
  m = m.replace(/\\ight\b/g, '\\right');

  // times / therefore as bare words
  m = m.replace(/(?<!\\)\btimes\b/gi, '\\times ');
  m = m.replace(/(?<!\\)\btherefore\b/gi, '\\Rightarrow ');

  // Remove trailing backslash-space artifact: "\ " → " "
  m = m.replace(/\\ (?![a-zA-Z{(])/g, ' ');
  // Remove orphan trailing backslash at end of line
  m = m.replace(/\\+\s*$/gm, '');

  return m;
};

// === Step 5: Fix TeX brace/syntax issues =====================================
export const fixTeXSyntax = (tex: string): string => {
  if (!tex) return '';
  let t = tex;

  // \over → \frac
  for (let i = 0; i < 5; i++) {
    if (!t.includes('\\over')) break;
    t = t.replace(/\{\s*([^{}]+?)\s+\\over\s+([^{}]+?)\s*\}/g, '\\frac{$1}{$2}');
    t = t.replace(/([a-zA-Z0-9_\{\}\(\)\|]+)\s+\\over\s+([a-zA-Z0-9_\{\}\(\)\|]+)/g,
      '\\frac{$1}{$2}');
  }

  // \matrix → \begin{matrix}
  t = t.replace(/\{\s*\\matrix\s*\{([\s\S]*?)\}\s*\}/g, '\\begin{matrix}$1\\end{matrix}');
  t = t.replace(/\\matrix\s*\{([\s\S]*?)\}/g, '\\begin{matrix}$1\\end{matrix}');

  // \cr → \\
  t = t.replace(/\\cr\b/g, '\\\\');

  // \left\{...\end{matrix}\right. → \begin{cases}
  t = t.replace(
    /\\left\\?\{?\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\\right\./g,
    '\\begin{cases}$1\\end{cases}'
  );

  // Fix \left{ / \right} without backslash
  t = t.replace(/\\left\{(?!\\|\{)/g, '\\left\\{');
  t = t.replace(/\\right\}(?!\\|\})/g, '\\right\\}');

  // Fix bare superscripts: x^-1 → x^{-1}
  t = t.replace(/(\^)(-[0-9]+)/g, '$1{$2}');

  // Fix spaces inside exponents
  t = t.replace(/\^\{\s*(-?\s*\d+)\s*\}/g, (_, n) => `^{${n.replace(/\s+/g, '')}}`);
  t = t.replace(/_\{\s*(\w+)\s*\}/g, (_, n) => `_{${n.trim()}}`);

  // Fix \frac missing denominator: \frac{X}nonBrace → \frac{X}{1}
  t = t.replace(/\\frac(\{(?:[^{}]|\{[^{}]*\})*\})(?!\s*\{)/g, '\\frac$1{1}');

  // Fix double-escaped braces: \\{\\{N\\}\\} → N
  t = t.replace(/\\\{\\\{([^{}\\]*)\\\}\\\}/g, '$1');
  t = t.replace(/\{\{([^{}\\]*)\}\}/g, '{$1}');

  // Collapse {{...}} → {...}
  for (let pass = 0; pass < 4; pass++) {
    const prev = t;
    t = t.replace(/\{\{([^{}]*)\}\}/g, '{$1}');
    if (t === prev) break;
  }

  // Fix \mathrm{X_y} and \text{X_y} subscript issues
  t = t.replace(/\\mathrm\s*\{\s*([a-zA-Z0-9]+)_([a-zA-Z0-9]+)\s*\}/g, '\\mathrm{$1}_{$2}');
  t = t.replace(/\\text\s*\{\s*([a-zA-Z0-9]+)_([a-zA-Z0-9]+)\s*\}/g, '\\text{$1}_{$2}');

  // Fix OCR exponents: ^\frac{2}{1} → ^2
  t = t.replace(/\^\s*\\frac\s*\{\s*(\d+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');

  // Fix \frac{I} and \frac{l} (OCR reads 1 as I or l)
  t = t.replace(/\\frac\s*\{\s*[Il]\s*\}/g, '\\frac{1}');
  t = t.replace(/\\frac\s*\{\s*-[Il]\s*\}/g, '\\frac{-1}');

  // Fix unescaped % in math
  t = t.replace(/([^\\])%/g, '$1\\%').replace(/^%/, '\\%');

  // Balance unclosed braces (small imbalances only, up to 6)
  let open = 0, close = 0;
  for (let ci = 0; ci < t.length; ci++) {
    if (t[ci] === '{' && (ci === 0 || t[ci - 1] !== '\\')) open++;
    else if (t[ci] === '}' && (ci === 0 || t[ci - 1] !== '\\')) close++;
  }
  const diff = open - close;
  if (diff > 0 && diff <= 6) t += '}'.repeat(diff);
  else if (diff < 0 && diff >= -6) t = '{'.repeat(-diff) + t;

  return t;
};

// === Master preprocessing entry point ========================================
export const preprocessTeXMacros = (tex: string): string => {
  if (!tex) return '';
  let m = tex;
  m = fixControlChars(m);   // 1. control chars
  m = convertUnicode(m);    // 2. Unicode → TeX  (MUST be before fixOCRMacros)
  m = fixOCRMacros(m);      // 3. bare OCR words → TeX
  m = fixTeXSyntax(m);      // 4. brace/syntax repair
  return m;
};

// === Utility: stripOrphanLeadingChars ========================================
export const stripOrphanLeadingChars = (text: string): string => {
  if (!text) return '';
  let t = text;
  t = t.replace(/^[\|({\[\s]+(?=\\[a-zA-Z]+)/gm, '');
  t = t.replace(/^[\|({\[\s]+(?=\\begin\{)/gm, '');
  t = t.replace(/[\|({\[]+(?=\\begin\{[a-zA-Z]+\})/gi, '');
  return t;
};

// === Utility: replaceRaiseLower (\raise/\lower → \raisebox) ==================
export const replaceRaiseLower = (text: string): string => {
  if (!text) return '';
  let result = '';
  let i = 0;
  const len = text.length;
  while (i < len) {
    if (text.startsWith('\\raise', i) || text.startsWith('\\lower', i)) {
      const isRaise = text.startsWith('\\raise', i);
      const startIdx = i;
      i += 6;
      while (i < len && /\s/.test(text[i])) i++;
      let dim = '';
      while (i < len && /[0-9.\-a-zA-Z]/.test(text[i])) { dim += text[i]; i++; }
      while (i < len && /\s/.test(text[i])) i++;
      if (text.startsWith('\\hbox', i)) {
        i += 5;
        while (i < len && /\s/.test(text[i])) i++;
        if (i < len && text[i] === '{') {
          i++;
          let braceCount = 1;
          let content = '';
          while (i < len && braceCount > 0) {
            const char = text[i];
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            if (braceCount > 0) content += char;
            i++;
          }
          let c = content.trim();
          while (c.startsWith('$')) c = c.slice(1).trim();
          while (c.endsWith('$')) c = c.slice(0, -1).trim();
          const d = isRaise ? dim : `-${dim}`;
          result += `\\raisebox{${d}}{$${c}$}`;
          continue;
        }
      }
      result += text.substring(startIdx, i);
      continue;
    }
    result += text[i];
    i++;
  }
  return result;
};

// === normalizeOptions =========================================================
export const normalizeOptions = (options: any): { key: string; value: any; label: string; val: any; index: number }[] => {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((v, i) => {
      const key = String.fromCharCode(65 + i);
      return { key, value: v, label: key, val: v, index: i };
    });
  }
  if (typeof options === 'object') {
    return Object.entries(options).map(([k, v], i) => {
      const label = String(k).length === 1 && /[0-9]/.test(k) ? String.fromCharCode(65 + Number(k)) : String(k).toUpperCase();
      return { key: k, value: v, label: label, val: v, index: i };
    });
  }
  return [];
};

// === isOptionCorrect ==========================================================
export const isOptionCorrect = (
  correctAnswer: any,
  optionKey: string | number,
  optionIndex: number,
  optionVal?: any
): boolean => {
  if (correctAnswer === undefined || correctAnswer === null) return false;
  const target = String(correctAnswer).trim();
  if (!target) return false;
  const keyStr = String(optionKey).trim();
  const idxStr = String(optionIndex);
  const idx1Str = String(optionIndex + 1);
  const letterStr = String.fromCharCode(65 + optionIndex);
  const targetUpper = target.toUpperCase();
  if (targetUpper === keyStr.toUpperCase() || targetUpper === letterStr.toUpperCase() ||
      target === idxStr || target === idx1Str) return true;
  if (optionVal !== undefined && optionVal !== null) {
    const valStr = String(optionVal).trim();
    if (valStr && (valStr.toUpperCase() === targetUpper || valStr === target)) return true;
  }
  return false;
};

// === autoFixDollarDelimiters ==================================================
export const autoFixDollarDelimiters = (raw: string): string => {
  if (!raw || !raw.includes('$')) return raw;
  const placeholders: string[] = [];
  const withPlaceholders = raw.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    placeholders.push(inner);
    return `___DISPLAY_MATH_${placeholders.length - 1}___`;
  });
  const singleDollarMatches = withPlaceholders.match(/(?<!\\)\$/g);
  const count = singleDollarMatches ? singleDollarMatches.length : 0;
  let fixed = withPlaceholders;
  if (count % 2 !== 0) {
    fixed = fixed.replace(/((?<!\\)\$[^\$\n]*?\\[a-zA-Z]+[^\$\n]*?)(?=\.|,|$|\n|\?)/g, '$1$');
    const newCount = (fixed.match(/(?<!\\)\$/g) || []).length;
    if (newCount % 2 !== 0) fixed += '$';
  }
  return fixed.replace(/___DISPLAY_MATH_(\d+)___/g,
    (_, idx) => `$$${placeholders[parseInt(idx, 10)]}$$`);
};

// === autoFixSlashDelimiters ===================================================
export const autoFixSlashDelimiters = (raw: string): string => {
  if (!raw) return raw;
  let text = raw;
  const openBracket = (text.match(/\\\[/g) || []).length;
  const closeBracket = (text.match(/\\\]/g) || []).length;
  if (openBracket > closeBracket) text += '\\]'.repeat(openBracket - closeBracket);
  const openParen = (text.match(/\\\(/g) || []).length;
  const closeParen = (text.match(/\\\)/g) || []).length;
  if (openParen > closeParen) text += '\\)'.repeat(openParen - closeParen);
  return text;
};

// === Main text cleaning pipeline =============================================
export const cleanQuestionText = (text: string): string => {
  if (!text) return '';
  let cleaned = fixControlChars(String(text));

  // 1. HTML sub/sup → TeX
  cleaned = cleaned
    .replace(/<sub>\s*(.*?)\s*<\/sub>/gi, '_{$1}')
    .replace(/<sup>\s*(.*?)\s*<\/sup>/gi, '^{$1}');

  // 2. HTML paragraph/break → newlines
  cleaned = cleaned
    .replace(/<p\b[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // 3. Extract TeX from MathML <annotation> blocks
  cleaned = cleaned.replace(
    /<annotation[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/gi,
    (_, tex) => ` $${tex.trim()}$ `
  );

  // 4. Decode HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // 5. Strip entity-encoded style/script blocks
  cleaned = cleaned.replace(/&lt;style[\s\S]*?&lt;\/style&gt;/gi, '');
  cleaned = cleaned.replace(/&lt;script[\s\S]*?&lt;\/script&gt;/gi, '');

  // 6. Strip HTML tags (keep allowlisted ones)
  cleaned = cleaned.replace(
    /<(?!(?:img|table|thead|tbody|tr|td|th|b|i|strong|em|ul|ol|li|span|h[1-6])\b)[^>]+>/gi, '');

  // 7. Strip internal watermarks
  cleaned = cleaned.replace(
    /(?:JEE(?:\s+(?:MAIN|ADVANCED))?|NEET|KCET|BITSAT)\s+(?:20[0-9]{2}|Paper|Exam|Question)/gi, '');

  // 8. Strip OCR metadata noise
  cleaned = cleaned.replace(
    /\b(?:Q\.?\s*\d+|Sol(?:ution)?\.?\s*:?|Ans(?:wer)?\.?\s*:?)\s*\n/gi, '');

  // 9. Strip PYQ bracket labels
  cleaned = cleaned.replace(
    /\[\s*(?:JEE|NEET|KCET|UPSC)?\s*(?:Hard|Medium|Easy|Advanced|Main)?\s*#\d+\s*\]/gi, '');
  cleaned = cleaned.replace(/\[\s*#\d+\s*\]/gi, '');

  // 10. Replace PUA font glyphs
  cleaned = cleaned.replace(/[\uf000-\uf0ff]/g, (char) => PUA_MAP[char] || '');

  // 11. Replace Unicode replacement chars adjacent to numbers
  cleaned = cleaned.replace(/10\s*<sup>\s*\ufffd\s*(\d+)\s*<\/sup>/gi, '10^{-$1}');
  cleaned = cleaned.replace(/\ufffd\s*10\^/g, '\\times 10^');
  cleaned = cleaned.replace(/(\d+)\s*\ufffd\s*10/g, '$1 \\times 10');
  cleaned = cleaned.replace(/\ufffd/g, ' ');

  // 12. Full TeX preprocessing (Unicode → OCR → Syntax)
  cleaned = preprocessTeXMacros(cleaned);

  // 13. Fix corrupted greatest-integer notation
  cleaned = cleaned.replace(/\[\s*\]\s*≡/g, '[·]').replace(/\[\s*\]\s*⋅/g, '[·]');

  // 14. Fix rho subscript formatting issues
  cleaned = cleaned.replace(/\{\s*\\rho\s*_\{([^}]+)\}\s*\}/g, '\\rho_{$1}');

  // 15. Fix {1v} → {v} (OCR digit-letter corruption)
  cleaned = cleaned.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)\}/g, '{$1}');
  cleaned = cleaned.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)/g, '{$1');

  // 16. Fix }}\s*WORD → } WORD
  cleaned = cleaned.replace(/\}\}\s*([a-zA-Z0-9_\^]+)/g, '} $1');

  // 17. Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 18. Strip orphan leading curly braces
  cleaned = cleaned.replace(/^\{{2,}\s*/gm, '');
  cleaned = cleaned.replace(/\{{2,}\s*([A-Za-z])/g, '$1');

  return cleaned.trim();
};

// === isQuestionMCQ ===========================================================
export const isQuestionMCQ = (q: any): boolean => {
  if (!q) return false;
  const normOpts = normalizeOptions(q.options);
  if (normOpts.length >= 2) return true;
  const typeUpper = String(q.type || '').toUpperCase();
  return typeUpper === 'MCQ' || typeUpper === 'SINGLE' || typeUpper === 'MULTIPLE';
};

// === checkUserAnswerCorrect ===================================================
export const checkUserAnswerCorrect = (q: any, userAnswer: any): boolean => {
  if (userAnswer === undefined || userAnswer === null ||
      String(userAnswer).trim() === '') return false;
  const normOpts = normalizeOptions(q.options);
  if (normOpts.length > 0) {
    return normOpts.some((opt, optIdx) =>
      isOptionCorrect(q.correct_answer ?? q.correctAnswer ?? q.answer, opt.key, optIdx, opt.value) &&
      (String(userAnswer).toUpperCase() === opt.key.toUpperCase() ||
       String(userAnswer) === String(optIdx) ||
       String(userAnswer) === String(optIdx + 1))
    );
  }
  const ans = String(q.correct_answer ?? q.correctAnswer ?? q.answer ?? '').trim();
  const ua = String(userAnswer).trim();
  if (!ans) return false;
  if (ans.toUpperCase() === ua.toUpperCase()) return true;
  const numAns = parseFloat(ans), numUA = parseFloat(ua);
  if (!isNaN(numAns) && !isNaN(numUA)) return Math.abs(numAns - numUA) < 0.01;
  return false;
};

// === isQuestionNumerical ======================================================
export const isQuestionNumerical = (q: any): boolean => {
  if (!q) return false;
  const normOpts = normalizeOptions(q.options);
  if (normOpts.length > 0) return false;
  const typeUpper = String(q.type || '').toUpperCase();
  return typeUpper === 'NUMERICAL' || typeUpper === 'INTEGER' || typeUpper === 'NUMERIC';
};

// === getQuestionSolution =====================================================
// Extracts the solution/explanation text from a question object.
// Handles various field naming conventions from different database schemas.
export const getQuestionSolution = (q: any): string => {
  if (!q) return '';
  const raw =
    q.solution ?? q.explanation ?? q.solution_text ?? q.answer_explanation ??
    q.sol ?? q.exp ?? q.detailed_solution ?? q.hint ?? '';
  return typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
};
