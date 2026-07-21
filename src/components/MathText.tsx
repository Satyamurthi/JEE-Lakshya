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

export const splitIntoSegments = (text: string): string[] => {
  const segments: string[] = [];
  let i = 0;
  const len = text.length;
  let lastIdx = 0;

  while (i < len) {
    if (text.startsWith('$$', i)) {
      segments.push(text.substring(lastIdx, i));
      const start = i;
      i += 2;
      let braceDepth = 0;
      while (i < len) {
        if (text[i] === '{') {
          braceDepth++;
        } else if (text[i] === '}') {
          if (braceDepth > 0) braceDepth--;
        } else if (text.startsWith('$$', i) && braceDepth === 0) {
          break;
        }
        i++;
      }
      if (i < len) {
        i += 2;
        segments.push(text.substring(start, i));
      } else {
        segments.push(text.substring(start));
      }
      lastIdx = i;
      continue;
    }
    
    if (text[i] === '$') {
      segments.push(text.substring(lastIdx, i));
      const start = i;
      i += 1;
      let braceDepth = 0;
      while (i < len) {
        if (text[i] === '{') {
          braceDepth++;
        } else if (text[i] === '}') {
          if (braceDepth > 0) braceDepth--;
        } else if (text[i] === '$' && braceDepth === 0) {
          break;
        }
        i++;
      }
      if (i < len) {
        i += 1;
        segments.push(text.substring(start, i));
      } else {
        segments.push(text.substring(start));
      }
      lastIdx = i;
      continue;
    }
    
    i++;
  }
  
  segments.push(text.substring(lastIdx, i));
  return segments;
};

export const renderMathInText = (rawText: string, inlineOnly = false): string => {
  if (!rawText) return '';
  
  // Clean and sanitize text first
  let text = cleanQuestionText(String(rawText));

  if (inlineOnly) {
    // Demote display math to inline
    text = text.replace(/\$\$/g, '$');
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, '\\($1\\)');
  }

  // 0. Standardize LaTeX delimiters \[ ... \] and \( ... \)
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$$$');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');

  // 1. Check if the ENTIRE text is a bare LaTeX formula without $ delimiters (e.g. \left\{ ... \right. or \begin{cases} ... \end{cases})
  const hasDelimiters = text.includes('$') || text.includes('\\(') || text.includes('\\[');
  const containsTeXMacro = /\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|over|ne|le|ge|to|infty|sum|prod|int|lim|sin|cos|tan|log|ln|cdot|times|pm|mp|partial|nabla)/i.test(text);

  if (!hasDelimiters && containsTeXMacro) {
    // Auto-wrap bare math formulas in display math $$...$$ if multi-line or contains cases/matrices, otherwise $...$
    if (text.includes('\\begin{') || text.includes('\\left\\{') || text.includes('\\\\') || text.length > 50) {
      text = `$$${text}$$`;
    } else {
      text = `$${text}$`;
    }
  }

  // 2. Process segments split by existing $...$ or $$...$$
  const segments = splitIntoSegments(text);
  const processedSegments = segments.map((part, idx) => {
    // Odd indices (1, 3, 5...) are math blocks delimited by $$...$$ or $...$
    if (idx % 2 === 1) {
      let isDisplay = part.startsWith('$$');
      let mathContent = isDisplay ? part.slice(2, -2) : part.slice(1, -1);

      if (inlineOnly) {
        isDisplay = false;
      }

      try {
        const cleanedMath = preprocessTeXMacros(mathContent.trim());
        return katex.renderToString(cleanedMath, { displayMode: isDisplay, throwOnError: false });
      } catch (e) {
        console.error("KaTeX render error:", e);
        return part;
      }
    }

    // Even indices (0, 2, 4...) are non-math text
    let p = part;
    if (/\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|over|ne|le|ge|to|infty|sum|prod|int|lim|sin|cos|tan|log|ln|cdot|times|pm|mp|partial|nabla)/i.test(p)) {
      p = p.replace(/(\\left[\s\S]*?\\right\.?|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}|\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|\\vec\{[^}]+\}|\\hat\{[^}]+\})/g, (match, inner) => {
        try {
          const cleanedMath = preprocessTeXMacros(inner.trim());
          return katex.renderToString(cleanedMath, { displayMode: !inlineOnly, throwOnError: false });
        } catch {
          return match;
        }
      });
    }
    return p;
  });

  return processedSegments.join('');
};

const MathText: FC<MathTextProps> = ({ children, text, className = '', inlineOnly = false }) => {
  const contentToRender = children !== undefined ? children : (text !== undefined ? text : '');
  const htmlContent = renderMathInText(contentToRender, inlineOnly);

  return (
    <span 
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
