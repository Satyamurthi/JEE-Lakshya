import { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanQuestionText, preprocessTeXMacros } from '../utils/sanitizer';

interface MathTextProps {
  children?: string;
  text?: string;
  className?: string;
  inlineOnly?: boolean;
}

type Segment = { type: 'text' | 'inline' | 'display'; content: string };

/**
 * Split raw text into an array of typed segments.
 * Each segment is tagged as 'display' ($$...$$), 'inline' ($...$), or 'text'.
 * This avoids the broken idx%2 parity approach.
 */
export const splitIntoSegments = (text: string): Segment[] => {
  const segments: Segment[] = [];
  let i = 0;
  const len = text.length;
  let textStart = 0;

  const pushText = (end: number) => {
    const t = text.substring(textStart, end);
    if (t) segments.push({ type: 'text', content: t });
  };

  while (i < len) {
    // ---- Display math: $$ ... $$  or  \[ ... \] ----
    if (text.startsWith('$$', i)) {
      // Ensure there is a closing $$
      const close$$ = text.indexOf('$$', i + 2);
      if (close$$ === -1) {
        // No closing $$ — skip over to prevent consuming rest of text
        i++;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      let depth = 0;
      while (i < len) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { if (depth > 0) depth--; }
        else if (text.startsWith('$$', i) && depth === 0) break;
        i++;
      }
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 2; // skip closing $$
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Display math: \[ ... \] ----
    if (text.startsWith('\\[', i)) {
      const closePos = text.indexOf('\\]', i + 2);
      if (closePos === -1) {
        // No closing \] found — treat as plain text to avoid swallowing entire rest of string
        i++;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      while (i < len && !text.startsWith('\\]', i)) i++;
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Inline math: \( ... \) ----
    if (text.startsWith('\\(', i)) {
      const closePos = text.indexOf('\\)', i + 2);
      if (closePos === -1) {
        // No closing \) found — treat as plain text
        i++;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      while (i < len && !text.startsWith('\\)', i)) i++;
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'inline', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Inline math: $...$ (single dollar, not $$) ----
    if (text[i] === '$' && !text.startsWith('$$', i)) {
      // Look ahead for a matching close $ (not preceded by another $)
      const closeDollar = text.indexOf('$', i + 1);
      if (closeDollar === -1) {
        // No closing $ — treat as plain text
        i++;
        continue;
      }
      pushText(i);
      i += 1;
      const mathStart = i;
      let depth = 0;
      while (i < len) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { if (depth > 0) depth--; }
        else if (text[i] === '$' && depth === 0) break;
        i++;
      }
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 1; // skip closing $
      segments.push({ type: 'inline', content: mathContent });
      textStart = i;
      continue;
    }

    i++;
  }

  // Flush remaining text
  pushText(i);
  return segments;
};

/** Fix common corruption patterns before KaTeX rendering */
const fixCorruptedTeX = (tex: string): string => {
  let t = tex;

  // ── Corrupted command names (PDF extraction artifacts) ──────────────────
  t = t.replace(/\\azin\b/g, '\\sin');   // \azin → \sin
  t = t.replace(/\\asin\b/g, '\\sin');   // \asin → \sin (non-standard)
  t = t.replace(/\\acos\b/g, '\\cos');
  t = t.replace(/\\atan\b/g, '\\tan');
  t = t.replace(/\\acot\b/g, '\\cot');
  t = t.replace(/\\tg\b/g, '\\tan');     // Russian notation
  t = t.replace(/\\ctg\b/g, '\\cot');

  // ── Fix unit dots and greek letter corruptions (e.g., \mu . N. → \mu\text{N}) ─────
  t = t.replace(/\\(mu|micro|nano|pico|femto|milli|kilo|mega|giga)\s*\.\s*([A-Za-z]+)\.?(?=\s|$|\\|\$)/gi, '\\$1\\text{$2}');
  t = t.replace(/\\(mu|micro)\s*([NCFHzmVAKgJWsT]|mol|rad|cd)\b(?!\s*\{)/g, '\\mu\\text{$2}');
  t = t.replace(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\s*\.(?=\s|$|\\|\$)/g, '\\$1 ');
  t = t.replace(/(\\times|\\cdot)\s*10(?!\^)/g, '$1 10^');
  t = t.replace(/=\s*\\times/g, '= \\times');

  // ── Superscript/subscript spaces ─────────────────────────────────────────
  // ^{ - 1} → ^{-1},  ^{ 2 } → ^{2},  ^{-   1} → ^{-1}
  t = t.replace(/\^\{(\s*-?\s*\d+\s*)\}/g, (_, n) => `^{${n.replace(/\s+/g, '')}}`);
  t = t.replace(/\^\{\s*(-\s*)/g, '^{-');
  // x^-1 (no braces on negative exponent) → x^{-1}
  t = t.replace(/(\^)(-\d+)(?!\})/g, '$1{$2}');
  // x^n where n is multi-char but no braces: ^12 → ^{12}
  t = t.replace(/\^(\d{2,})/g, '^{$1}');

  // ── Trig functions with space before ^ ───────────────────────────────────
  // \sin ^{ - 1} → \sin^{-1}
  t = t.replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|exp)\s+\^/g, '\\$1^');

  // ── \left / \right mismatches ─────────────────────────────────────────────
  // \left[ without matching \right] → fix \right. or \right) to \right]
  const leftBracket = (t.match(/\\left\[/g) || []).length;
  const rightBracket = (t.match(/\\right\]/g) || []).length;
  if (leftBracket > rightBracket) {
    let replaced = 0;
    const needed = leftBracket - rightBracket;
    t = t.replace(/\\right[.)](?!\])/g, (m) => {
      if (replaced < needed) { replaced++; return '\\right]'; }
      return m;
    });
  }
  // \left( without matching \right)
  const leftParen = (t.match(/\\left\(/g) || []).length;
  const rightParen = (t.match(/\\right\)/g) || []).length;
  if (leftParen > rightParen) {
    let replaced = 0;
    const needed = leftParen - rightParen;
    t = t.replace(/\\right[.\]](?!\))/g, (m) => {
      if (replaced < needed) { replaced++; return '\\right)'; }
      return m;
    });
  }

  // ── Other common JEE/NEET corruption patterns ─────────────────────────────
  t = t.replace(/\btimes\b(?!\\)/g, '\\times');
  t = t.replace(/\s+([_^])\s*\{/g, '$1{');
  t = t.replace(/\)\s*\((?!\s*[)\]}])/g, ') \\cdot (');
  t = t.replace(/^\s*\)\s*\)/g, '');
  t = t.replace(/\\right\s*$/g, '');
  t = t.replace(/\\left\s*$/g, '');

  return t;
};

/** KaTeX render helper — returns rendered HTML or a styled fallback (never raw TeX or red boxes) */
const renderKaTeX = (mathContent: string, displayMode: boolean): string => {
  try {
    const fixed = fixCorruptedTeX(mathContent.trim());
    const cleaned = preprocessTeXMacros(fixed);
    const result = katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        '\\degree': '^{\\circ}',
        '\\Celsius': '^{\\circ}\\text{C}',
        '\\eps': '\\varepsilon',
        '\\d': '\\mathrm{d}',
      },
    });

    // If KaTeX generated a red error box internally, clean up the error box styling
    if (result.includes('katex-error')) {
      const sanitizedResult = result
        .replace(/katex-error/g, 'katex-rendered')
        .replace(/color:\s*#cc0000/g, 'color:inherit')
        .replace(/border:[^;"]+/g, 'border:none');
      
      try {
        const textOnly = katex.renderToString(`\\text{${cleaned.replace(/[\$\\]/g, '').replace(/[\{\}]/g, ' ')}}`, {
          displayMode: false,
          throwOnError: false
        });
        if (!textOnly.includes('katex-error')) return textOnly;
      } catch (e) {}

      return sanitizedResult;
    }

    return result;
  } catch (e) {
    console.warn('KaTeX render error:', e, 'Content:', mathContent);
    const safe = mathContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<span class="katex-fallback" style="font-family:inherit;color:inherit;font-style:normal;">${safe}</span>`;
  }
};

/** Detect if a plain text segment still contains bare TeX macros */
const BARE_TEX_RE =
  /\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|bar|tilde|dot|ddot|widehat|widetilde|overline|underline|overbrace|underbrace|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|over|ne|le|ge|to|infty|sum|prod|int|oint|lim|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|log|ln|exp|det|cdot|times|div|pm|mp|partial|nabla|hbar|ell|forall|exists|in|notin|subset|supset|cup|cap|emptyset|angle|parallel|perp|propto|sim|approx|equiv|cong|neq|leq|geq|ll|gg|subset|supset|subseteq|supseteq|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|uparrow|downarrow|text|mathrm|mathbf|mathit|mathcal|mathbb|operatorname|underset|overset|stackrel|limits|nolimits|displaystyle|textstyle|scriptstyle|scriptscriptstyle|raisebox|rule|hspace|vspace|mbox|quad|qquad|,|;|!|:|\\\\)/i;

/**
 * Process a plain-text segment that might contain bare TeX macros
 * not wrapped in $ delimiters (common in AI-generated question banks).
 */
const processTextSegment = (text: string, inlineOnly: boolean): string => {
  if (!BARE_TEX_RE.test(text)) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const trimmed = text.trim();
  const hasCases = trimmed.includes('\\begin{') || trimmed.includes('\\left\\{') || trimmed.includes('\\[');
  const hasNewlines = trimmed.includes('\\\\');
  const startsWithMacro = /^\\(frac|sqrt|matrix|cases|begin|int|sum|prod|lim|vec|hat|overline)\b/.test(trimmed);
  const startsWithWord = /^[A-Za-z]{2,}\s/.test(trimmed);

  const isLikelyFullFormula = (hasCases || hasNewlines || (startsWithMacro && !startsWithWord)) && trimmed.length > 3;

  if (isLikelyFullFormula) {
    const displayMode = !inlineOnly && (hasCases || hasNewlines || trimmed.length > 60);
    return renderKaTeX(trimmed, displayMode);
  }

  // Otherwise scan for inline macro-containing sub-tokens
  const INLINE_MATH_RE =
    /\\(?:left[\s\S]*?\\right(?:\.|[|)])|begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}|(?:frac|sqrt|vec|hat|bar|tilde|overline|underline|text|mathrm|mathbf|mathit|mathcal|mathbb|operatorname)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}(?:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\})?|(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|hbar|ell|infty|nabla|partial|forall|exists|emptyset|angle|parallel|perp|propto|pm|mp|times|div|cdot|le|ge|ne|approx|equiv|cong|sim|ll|gg|to|rightarrow|leftarrow|Rightarrow|Leftarrow|in|notin|subset|supset|cup|cap|sum|prod|int|oint|lim|sin|cos|tan|log|ln|exp|det)\b(?:_\{?[^{}\s]+\}?)?(?:\^\{?[^{}\s]+\}?)?)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_MATH_RE.lastIndex = 0;
  while ((match = INLINE_MATH_RE.exec(text)) !== null) {
    const before = text.substring(lastIndex, match.index);
    if (before) {
      result += before.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    result += renderKaTeX(match[0], false);
    lastIndex = match.index + match[0].length;
  }
  const after = text.substring(lastIndex);
  if (after) {
    result += after.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  return result;
};

/**
 * Convert newlines to <br> and format numbered lists / bullet lists nicely.
 * Also handles simple markdown-style **bold** and `code` in plain-text portions.
 */
const formatTextContent = (html: string): string => {
  // Detect numbered list lines like "1. Something"
  const lines = html.split(/\n|\r\n?/);
  if (lines.length <= 1) return html;

  // Check if it looks like a list
  const numberedRe = /^\s*\d+[\.\)]\s/;
  const bulletRe = /^\s*[-•*]\s/;
  const hasNumbered = lines.some(l => numberedRe.test(l));
  const hasBullet = lines.some(l => bulletRe.test(l));

  if (hasNumbered || hasBullet) {
    let out = '';
    let inList = false;
    const listTag = hasNumbered ? 'ol' : 'ul';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) { out += `</${listTag}>`; inList = false; }
        continue;
      }
      if (numberedRe.test(trimmed) || bulletRe.test(trimmed)) {
        if (!inList) { out += `<${listTag} style="margin:0.5em 0 0.5em 1.5em; padding:0;">`; inList = true; }
        const content = trimmed.replace(/^\s*(?:\d+[\.\)]|[-•*])\s*/, '');
        out += `<li style="margin:2px 0;">${content}</li>`;
      } else {
        if (inList) { out += `</${listTag}>`; inList = false; }
        out += line + '<br>';
      }
    }
    if (inList) out += `</${listTag}>`;
    return out;
  }

  return lines.join('<br>');
};

export const renderMathInText = (rawText: string, inlineOnly = false): string => {
  if (!rawText) return '';

  // Step 1: Clean & sanitize
  const text = cleanQuestionText(String(rawText));
  if (!text) return '';

  // Step 2: Check if the entire cleaned text is a bare formula (no delimiters at all)
  const hasDelimiters =
    text.includes('$') || text.includes('\\(') || text.includes('\\[');
  const hasBareTeX = BARE_TEX_RE.test(text);

  if (!hasDelimiters && hasBareTeX) {
    const hasCases = text.includes('\\begin{') || text.includes('\\left\\{');
    const hasNewlines = text.includes('\\\\');
    const displayMode =
      !inlineOnly && (hasCases || hasNewlines || text.length > 60);
    return renderKaTeX(text, displayMode);
  }

  // Step 3: Split into typed segments and render each
  const segments = splitIntoSegments(text);
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.type === 'display') {
      const html = renderKaTeX(seg.content, !inlineOnly);
      parts.push(html);
    } else if (seg.type === 'inline') {
      const html = renderKaTeX(seg.content, false);
      parts.push(html);
    } else {
      // Plain text — may still contain bare TeX
      const rendered = processTextSegment(seg.content, inlineOnly);
      parts.push(rendered);
    }
  }

  const joined = parts.join('');

  // Step 4: Format newlines & lists in the final HTML
  // Only format the text parts, not inside katex spans
  return formatTextContent(joined);
};

const MathText: FC<MathTextProps> = ({
  children,
  text,
  className = '',
  inlineOnly = false,
}) => {
  const contentToRender =
    children !== undefined ? children : text !== undefined ? text : '';
  const htmlContent = renderMathInText(contentToRender, inlineOnly);

  return (
    <span
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
