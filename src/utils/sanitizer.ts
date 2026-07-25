/**
 * Question & Math Sanitizer Utility
 * Cleans raw text, decodes HTML entities, strips internal tags like [JEE Hard #123],
 * strips malformed/pre-rendered HTML, and fixes KaTeX/TeX formatting errors.
 *
 * This utility is the first line of defence before KaTeX rendering.
 */

// ─── Private Use Area (PUA) glyph map — from PDF-extracted questions ──────────
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
  // Additional common PUA glyphs
  '\uf0b5': 'μ',
  '\uf04e': 'N',
  '\uf052': 'R',
  '\uf04f': 'O',
  '\uf041': 'A',
  '\uf042': 'B',
  '\uf043': 'C',
  '\uf044': 'D',
  '\uf045': 'E',
  '\uf046': 'F',
  '\uf047': 'G',
  '\uf048': 'H',
};

/**
 * Collapse {{ ... }} → { ... } using a character-level scanner.
 * Tracks depth from the OUTER { so that patterns like {{A}{B}} and
 * {{{\frac{a}{b}}}} all correctly collapse, regardless of nesting depth.
 * Runs up to 4 passes for multiple levels of double-wrapping.
 */
const collapseDoubleBraces = (tex: string): string => {
  let t = tex;
  for (let pass = 0; pass < 4; pass++) {
    let result = '';
    let i = 0;
    let changed = false;
    while (i < t.length) {
      // Detect {{ (unescaped)
      if (t[i] === '{' && i + 1 < t.length && t[i + 1] === '{' &&
          (i === 0 || t[i - 1] !== '\\')) {
        // Track from the OUTER { until its matching }
        let depth = 0;
        let j = i;
        while (j < t.length) {
          if (t[j] === '{' && (j === 0 || t[j - 1] !== '\\')) depth++;
          else if (t[j] === '}' && (j === 0 || t[j - 1] !== '\\')) {
            depth--;
            if (depth === 0) { j++; break; }
          }
          j++;
        }
        // segment = t[i..j) is the full outer group
        const segment = t.substring(i, j);
        if (segment.startsWith('{{') && segment.endsWith('}}')) {
          // Strip one outer brace layer: {{ X }} → { X }
          // slice(1,-1) removes the outermost { and }
          result += segment.slice(1, -1);
          i = j;
          changed = true;
          continue;
        }
      }
      result += t[i];
      i++;
    }
    t = result;
    if (!changed) break;
  }
  // Final pass: handle remaining unbalanced double-open {{simple}
  // (outer } is missing — just strip the extra leading {)
  t = t.replace(/\{\{([^{}]*)\}/g, '{$1}');
  // Strip orphan triple/double opening braces from text: {{{ For rolling wheel -> For rolling wheel
  t = t.replace(/^\{\{\{+/g, '');
  t = t.replace(/^\{\{+/g, '');
  t = t.replace(/\{\{\{+(\s*[a-zA-Z])/g, '$1');
  t = t.replace(/\{\{+(\s*[a-zA-Z])/g, '$1');
  return t;
};

// ─── Fix corrupted TeX fraction/brace syntax ──────────────────────────────────
export const fixTeXBraces = (tex: string): string => {
  if (!tex) return '';
  let t = tex;

  // 0. Fix double-escaped braces from PDF extraction: \\{\\{N\\}\\} → N
  t = t.replace(/\\\{\\\{([^{}\\]*)\\\}\\\}/g, '$1');

  // 0a. Collapse {{ ... }} → { ... } with full nested-brace support
  t = collapseDoubleBraces(t);

  // 0b. Fix \frac whose first brace-arg contains two sub-groups (missing split):
  //   \frac{{A}{B}} → \frac{A}{B}  (run AFTER collapseDoubleBraces)
  t = t.replace(
    /\\frac\s*\{\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\}/g,
    '\\frac$1$2'
  );

  // 0c. Strip redundant outer braces around trig functions: {\sin^{-1}} → \sin^{-1}
  t = t.replace(/\{(\\(?:sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|log|ln|exp)(?:[^{}]|\{[^{}]*\})*)\}/g, '$1');

  // 0d. Recover \frac with missing denominator: \frac{X}nonBrace → \frac{X}{1}
  t = t.replace(/\\frac(\{(?:[^{}]|\{[^{}]*\})*\})(?!\s*\{)/g, '\\frac$1{1}');

  // 0e. Fix spaces inside superscripts/subscripts: ^{ - 1} → ^{-1}, ^{ 2 } → ^{2}
  t = t.replace(/\^\{\s*(-?\s*\d+)\s*\}/g, (_, n) => `^{${n.replace(/\s+/g, '')}}`);
  t = t.replace(/_\{\s*(\w+)\s*\}/g, (_, n) => `_{${n.trim()}}`);

  // 0f. Fix bare superscripts without braces on multi-char exponents: x^-1 → x^{-1}
  t = t.replace(/(\^)(-[0-9]+)/g, '$1{$2}');

  // 1. Fix \frac with extra outer parens only
  t = t.replace(
    /\\frac\s*\{\s*\(\s*([^(){}\\]+)\s*\)\s*\}\s*\{\s*\(?\s*([^(){}\\]+)\s*\)?\s*\}/gi,
    '\\frac{$1}{$2}'
  );

  // 2. Fix double parentheses: ((A)) → (A)
  t = t.replace(/\(\(\s*([^()]+)\s*\)\)/gi, '($1)');

  // 3. Fix \left{/\right} without backslash
  t = t.replace(/\\left\{(?!\\|\s*\\)/g, '\\left\\{');
  t = t.replace(/\\right\}(?!\\|\s*\\)/g, '\\right\\}');

  // 4. Ensure \left[ has matching \right] and \left( has matching \right)
  //    If \left[ exists without \right], fix \right. → \right]
  if ((t.match(/\\left\[/g) || []).length !== (t.match(/\\right\]/g) || []).length) {
    t = t.replace(/\\right\./g, '\\right]');
  }
  if ((t.match(/\\left\(/g) || []).length !== (t.match(/\\right\)/g) || []).length) {
    t = t.replace(/\\right\./g, '\\right)');
  }

  // 5. Balance unclosed braces (only if difference is small)
  let openCount = 0;
  let closeCount = 0;
  for (let ci = 0; ci < t.length; ci++) {
    if (t[ci] === '{' && (ci === 0 || t[ci - 1] !== '\\')) openCount++;
    else if (t[ci] === '}' && (ci === 0 || t[ci - 1] !== '\\')) closeCount++;
  }
  const diff = openCount - closeCount;
  if (diff > 0 && diff <= 5) t += '}'.repeat(diff);
  else if (diff < 0 && diff >= -5) t = '{'.repeat(-diff) + t;
  return t;
};

// ─── Replace plain TeX \\raise / \\lower with KaTeX \\raisebox ───────────────
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
      while (i < len && /[0-9\.\-a-zA-Z]/.test(text[i])) {
        dim += text[i];
        i++;
      }

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

          let cleanedContent = content.trim();
          while (cleanedContent.startsWith('$')) cleanedContent = cleanedContent.slice(1).trim();
          while (cleanedContent.endsWith('$')) cleanedContent = cleanedContent.slice(0, -1).trim();

          const targetDim = isRaise ? dim : `-${dim}`;
          result += `\\raisebox{${targetDim}}{$${cleanedContent}$}`;
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

// ─── Full TeX macro preprocessing pipeline ────────────────────────────────────
export const preprocessTeXMacros = (tex: string): string => {
  if (!tex) return '';
  let m = tex;

  // 0. Replace Plain TeX \\raise/\\lower with \\raisebox
  m = replaceRaiseLower(m);

  // Fix double-parentheses / corrupted braces first
  m = fixTeXBraces(m);

  // 1. Convert TeX \\over to \\frac: { A \\over B } → \\frac{A}{B}
  for (let i = 0; i < 5; i++) {
    if (!m.includes('\\over')) break;
    m = m.replace(/\{\s*([^{}]+?)\s+\\over\s+([^{}]+?)\s*\}/g, '\\frac{$1}{$2}');
    m = m.replace(/([a-zA-Z0-9_\{\}\(\)\|]+)\s+\\over\s+([a-zA-Z0-9_\{\}\(\)\|]+)/g, '\\frac{$1}{$2}');
  }

  // 2. Convert plain TeX \\matrix notation
  m = m.replace(/\{\s*\\matrix\s*\{([\s\S]*?)\}\s*\}/g, '\\begin{matrix}$1\\end{matrix}');
  m = m.replace(/\\matrix\s*\{([\s\S]*?)\}/g, '\\begin{matrix}$1\\end{matrix}');

  // 3. Convert TeX \\cr line breaks → KaTeX \\\\
  m = m.replace(/\\cr\b/g, '\\\\');

  // 4. Convert \\left\\{ \\begin{matrix}...\\end{matrix} \\right. → \\begin{cases}...\\end{cases}
  m = m.replace(
    /\\left\\?\{?\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\\right\./g,
    '\\begin{cases}$1\\end{cases}'
  );
  m = m.replace(/\\left\\?\{?\s*([\s\S]*?)\\right\./g, (match, inner) => {
    if (inner.includes('&') || inner.includes('\\\\')) {
      return `\\begin{cases}${inner}\\end{cases}`;
    }
    return match;
  });

  // 5. Fix \\left{ without proper backslash: \left{ → \left\{
  //    Note: fixTeXBraces() already handles this; this is an extra safety pass
  //    Use a safe pattern that won't double-escape already-fixed \left\{
  m = m.replace(/\\left\{(?!\\|\{)/g, '\\left\\{');
  m = m.replace(/\\right\}(?!\\|\})/g, '\\right\\}');

  // 6. Convert Plain TeX italic correction \/ → /
  m = m.replace(/\\\/([^\/a-zA-Z]|$)/g, '/$1');
  m = m.replace(/\\\//g, '/');

  // 7. Fix unescaped % signs inside math (LaTeX comment char, but KaTeX doesn't allow it)
  // Use a replace with function to avoid lookbehind (not universally supported)
  m = m.replace(/([^\\])%/g, '$1\\%').replace(/^%/, '\\%');

  // 8. Normalize \dfrac → \frac (KaTeX supports it but normalize for consistency)
  // Keep as-is — KaTeX handles \dfrac natively.

  // 9. Fix pmatrix / bmatrix if written as matrix
  m = m.replace(/\\begin\{pmatrix\}/g, '\\begin{pmatrix}');
  m = m.replace(/\\begin\{bmatrix\}/g, '\\begin{bmatrix}');

  // 10. Fix double-escaped braces one more time after all macro processing
  m = m.replace(/\\\{\\\{([^{}\\]*)\\\}\\\}/g, '{$1}');
  m = m.replace(/\{\{([^{}\\]*)\}\}/g, '{$1}');

  // 11. Fix PDF OCR / extraction corruption artifacts (\eft -> \left, \ight -> \right)
  m = m.replace(/\\eft\b/g, '\\left');
  m = m.replace(/\\ight\b/g, '\\right');
  m = m.replace(/\\(int|sum|prod|lim|oint)\s*_\s*\\limits/g, '\\$1\\limits_');
  m = m.replace(/\\limits\s*O\b/g, '\\limits_{0}');
  m = m.replace(/_O\b(?!\w)/g, '_{0}');
  m = m.replace(/_O\^/g, '_{0}^');
  m = m.replace(/\\frac\s*\{\s*-I\s*\}/g, '\\frac{-1}');
  m = m.replace(/\\frac\s*\{\s*I\s*\}/g, '\\frac{1}');
  m = m.replace(/\\frac\s*\{\s*-l\s*\}/g, '\\frac{-1}');
  m = m.replace(/\\frac\s*\{\s*l\s*\}/g, '\\frac{1}');

  // 12. Fix corrupted SI unit dots and trailing punctuation attached to greek letters
  m = m.replace(/\\(mu|micro|nano|pico|femto|milli|kilo|mega|giga)\s*\.\s*([A-Za-z]+)\.?(?=\s|$|\\|\$)/gi, '\\$1\\text{$2}');
  m = m.replace(/\\(mu|micro)\s*([NCFHzmVAKgJWsT]|mol|rad|cd)\b(?!\s*\{)/g, '\\mu\\text{$2}');
  m = m.replace(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\s*\.(?=\s|$|\\|\$)/g, '\\$1 ');
  m = m.replace(/(\\times|\\cdot)\s*10(?!\^)/g, '$1 10^');
  m = m.replace(/=\s*\\times/g, '= \\times');
  m = m.replace(/(?<!\\)\btimes\b/gi, '\\times ');
  m = m.replace(/(?<!\\)\btherefore\b/gi, '\\therefore ');
  m = m.replace(/\\therefore\b/g, '\\Rightarrow ');

  // 13. Fix bare PDF OCR macros missing backslashes (frac 1 1 12 -> \frac{1}{12}, frac 24 1 25 -> \frac{24}{25}, left[ -> \left[, right] -> \right])
  m = m.replace(/(?<!\\)\bfracfrac(\d)(\d{2})(\d{2})/gi, '\\frac{\\frac{$1}{$2}}{$3}');
  m = m.replace(/(?<!\\)\bfracfrac/gi, '\\frac{\\frac');
  m = m.replace(/(?<!\\)\bfrac\s+(\d+)\s+1\s+(\d+)\b/gi, '\\frac{$1}{$2}');
  m = m.replace(/(?<!\\)\bfrac\s+(\d+)\s+(\d+)\b/gi, '\\frac{$1}{$2}');
  m = m.replace(/(?<!\\)\bleft\[/gi, '\\left[');
  m = m.replace(/(?<!\\)\bright\]/gi, '\\right]');
  m = m.replace(/(?<!\\)\bleft\(/gi, '\\left(');
  m = m.replace(/(?<!\\)\bright\)/gi, '\\right)');

  // 14. Fix PDF OCR variable corruption artifacts inside braces ({1v} -> {v}, {1u} -> {u}, {1a_i} -> {a_i})
  m = m.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)\}/g, '{$1}');
  m = m.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)/g, '{$1');

  // 15. Fix PDF OCR exponents (^\frac{2}{1} -> ^2, ^\frac{3}{1} -> ^3)
  m = m.replace(/\^\s*\\frac\s*\{\s*(\d+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');
  m = m.replace(/\^\s*\\frac\s*\{\s*([a-zA-Z0-9+\-]+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');

  // 16. Fix missing \frac before differential brace pairs ({dv}{dt} -> \frac{dv}{dt})
  m = m.replace(/(?<!\\frac)\{([a-zA-Z0-9_\^\s]+)\}\s*\{([a-zA-Z0-9_\^\s]+)\}/g, (match, g1, g2) => {
    if (g1.startsWith('d') || g2.startsWith('d') || g2 === 'dt' || g2 === 'dx' || g2 === 'dy' || g2 === 'dz') {
      return `\\frac{${g1}}{${g2}}`;
    }
    return match;
  });

  // 17. Fix OCR closing brace mismatches (^2}}{v_I} -> ^2 v_I)
  m = m.replace(/\}\}\s*([a-zA-Z0-9_\^]+)/g, '} $1');
  m = m.replace(/\}\s*\{\s*([a-zA-Z0-9_]+)\s*\}/g, '} $1');

  return m;
};

/** Auto-balance and fix unclosed dollar delimiters in question text */
export const autoFixDollarDelimiters = (raw: string): string => {
  if (!raw || !raw.includes('$')) return raw;
  
  // Replace display math $$ first to count single inline dollars
  const placeholders: string[] = [];
  const withPlaceholders = raw.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    placeholders.push(inner);
    return `___DISPLAY_MATH_${placeholders.length - 1}___`;
  });

  // Count single dollars
  const singleDollarMatches = withPlaceholders.match(/(?<!\\)\$/g);
  const count = singleDollarMatches ? singleDollarMatches.length : 0;

  let fixed = withPlaceholders;
  if (count % 2 !== 0) {
    // Unclosed $ detected!
    // If there is an unclosed $ containing a TeX macro before punctuation or end of text, close it
    fixed = fixed.replace(/((?<!\\)\$[^\$\n]*?\\[a-zA-Z]+[^\$\n]*?)(?=\.|\,|$|\n|\?)/g, '$1$');
    
    const newCount = (fixed.match(/(?<!\\)\$/g) || []).length;
    if (newCount % 2 !== 0) {
      fixed += '$';
    }
  }

  // Restore display math
  return fixed.replace(/___DISPLAY_MATH_(\d+)___/g, (_, idx) => `$$${placeholders[parseInt(idx, 10)]}$$`);
};

// ─── Main text cleaning pipeline ─────────────────────────────────────────────
export const cleanQuestionText = (text: string): string => {
  if (!text) return '';

  let cleaned = String(text);

  // 1. Decode HTML entities (&lt; → <, &gt; → >, &amp; → &, etc.)
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 1.5 Auto-fix unclosed dollar delimiters
  cleaned = autoFixDollarDelimiters(cleaned);

  // 2. Extract raw TeX from MathML <annotation> blocks if present
  if (/<[\s]*annotation/i.test(cleaned)) {
    cleaned = cleaned.replace(
      /<\s*annotation[^>]*>([\s\S]*?)<\s*\/\s*annotation\s*>/gi,
      ' $$$$ $1 $$$$ '
    );
  }

  // 3. Preserve TeX inside <math> tags before stripping HTML
  // Replace <math>...</math> with $$...$$ preserving content
  cleaned = cleaned.replace(/<math[^>]*>([\s\S]*?)<\/math>/gi, (_, inner) => {
    // Strip remaining tags inside math block
    const texContent = inner.replace(/<[^>]+>/g, '').trim();
    return texContent ? ` $$${texContent}$$ ` : '';
  });

  // 4. Strip ALL HTML-like tags (including malformed tags)
  cleaned = cleaned.replace(/<\s*\/?[^>]+>/gi, ' ');

  // 5. Strip internal exam identification tags like [JEE Hard #771], [#507]
  cleaned = cleaned.replace(
    /\[\s*(JEE|NEET|KCET|UPSC)?\s*(Hard|Medium|Easy|Advanced|Main)?\s*#\d+\s*\]/gi,
    ''
  );
  cleaned = cleaned.replace(/\[\s*#\d+\s*\]/gi, '');

  // 6. Replace Private Use Area (PUA) font glyphs from PDF extraction
  cleaned = cleaned.replace(/[\uf000-\uf0ff]/g, (char) => PUA_MAP[char] || '');

  // 7. Preprocess TeX macros (\\matrix, \\over, \\cr, brace fixes, etc.)
  cleaned = preprocessTeXMacros(cleaned);

  // 8. Fix corrupted greatest-integer notation artifacts
  cleaned = cleaned.replace(/\[\s*\]\s*≡/g, '[·]').replace(/\[\s*\]\s*⋅/g, '[·]');

  // 9. Fix rho subscript formatting issues
  cleaned = cleaned.replace(/\{\s*\\rho\s*_\{([^}]+)\}\s*\}/g, '\\rho_{$1}');

  // 10. Fix common Unicode math chars that should be TeX
  cleaned = cleaned
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\leq ')
    .replace(/≥/g, '\\geq ')
    .replace(/≠/g, '\\neq ')
    .replace(/≈/g, '\\approx ')
    .replace(/∞/g, '\\infty ')
    .replace(/∑/g, '\\sum ')
    .replace(/∏/g, '\\prod ')
    .replace(/∫/g, '\\int ')
    .replace(/√/g, '\\sqrt ')
    .replace(/π/g, '\\pi ')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/ε/g, '\\varepsilon ')
    .replace(/θ/g, '\\theta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/ν/g, '\\nu ')
    .replace(/ξ/g, '\\xi ')
    .replace(/ρ/g, '\\rho ')
    .replace(/σ/g, '\\sigma ')
    .replace(/τ/g, '\\tau ')
    .replace(/φ/g, '\\phi ')
    .replace(/χ/g, '\\chi ')
    .replace(/ψ/g, '\\psi ')
    .replace(/ω/g, '\\omega ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/Σ/g, '\\Sigma ')
    .replace(/Π/g, '\\Pi ')
    .replace(/Γ/g, '\\Gamma ')
    .replace(/Λ/g, '\\Lambda ')
    .replace(/→/g, '\\rightarrow ')
    .replace(/←/g, '\\leftarrow ')
    .replace(/↔/g, '\\leftrightarrow ')
    .replace(/⇒/g, '\\Rightarrow ')
    .replace(/⇔/g, '\\Leftrightarrow ')
    .replace(/∈/g, '\\in ')
    .replace(/∉/g, '\\notin ')
    .replace(/⊂/g, '\\subset ')
    .replace(/⊃/g, '\\supset ')
    .replace(/∪/g, '\\cup ')
    .replace(/∩/g, '\\cap ')
    .replace(/∅/g, '\\emptyset ')
    .replace(/∂/g, '\\partial ')
    .replace(/∇/g, '\\nabla ')
    .replace(/±/g, '\\pm ')
    .replace(/∓/g, '\\mp ')
    .replace(/·/g, '\\cdot ')
    .replace(/°/g, '^{\\circ}')
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/¹/g, '^{1}')
    .replace(/½/g, '\\frac{1}{2}')
    .replace(/⅓/g, '\\frac{1}{3}')
    .replace(/¼/g, '\\frac{1}{4}')
    .replace(/¾/g, '\\frac{3}{4}');

  // 11. Normalize contiguous whitespace (but preserve newlines for list detection)
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 12. Strip orphan leading curly braces (e.g., {{{{ For rolling wheel or {{{ For rolling wheel)
  cleaned = cleaned.replace(/^\{{1,4}}\s*/gm, '');
  cleaned = cleaned.replace(/\{{2,}\s*([A-Za-z])/g, '$1');

  return cleaned.trim();
};
