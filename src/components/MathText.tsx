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

/** KaTeX render helper — returns HTML string or fallback raw text */
const renderKaTeX = (mathContent: string, displayMode: boolean): string => {
  try {
    const cleaned = preprocessTeXMacros(mathContent.trim());
    return katex.renderToString(cleaned, {
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
  } catch (e) {
    console.warn('KaTeX render error:', e);
    return mathContent;
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
    // Pure text — escape HTML entities for safe rendering
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Attempt to detect if the entire segment is a bare math formula
  const trimmed = text.trim();
  const hasCases = trimmed.includes('\\begin{') || trimmed.includes('\\left\\{');
  const hasNewlines = trimmed.includes('\\\\');
  const isLikelyFullFormula =
    hasCases || hasNewlines || (BARE_TEX_RE.test(trimmed) && trimmed.length > 3);

  if (isLikelyFullFormula) {
    const displayMode = !inlineOnly && (hasCases || hasNewlines || trimmed.length > 60);
    return renderKaTeX(trimmed, displayMode);
  }

  // Otherwise scan for inline macro-containing sub-tokens
  // Regex: matches common inline TeX groups like \frac{a}{b}, \sqrt{x}, etc.
  const INLINE_MATH_RE =
    /\\(?:left[\s\S]*?\\right(?:\.|[|)])|begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}|(?:frac|sqrt|vec|hat|bar|tilde|overline|underline|text|mathrm|mathbf|mathit|mathcal|mathbb|operatorname)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}(?:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\})?|(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|hbar|ell|infty|nabla|partial|forall|exists|emptyset|angle|parallel|perp|propto|pm|mp|times|div|cdot|le|ge|ne|approx|equiv|cong|sim|ll|gg|to|rightarrow|leftarrow|Rightarrow|Leftarrow|in|notin|subset|supset|cup|cap|sum|prod|int|oint|lim|sin|cos|tan|log|ln|exp|det)\b)/g;

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
