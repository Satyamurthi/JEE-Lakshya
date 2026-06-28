import { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanQuestionText } from '../utils/sanitizer';

interface MathTextProps {
  children: string;
  className?: string;
}

const MathText: FC<MathTextProps> = ({ children, className = '' }) => {
  const renderMathInText = (rawText: string): string => {
    if (!rawText) return '';
    
    // Clean and sanitize text first
    let text = cleanQuestionText(rawText);

    // 1. Process double dollars: $$ ... $$
    let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      try {
        const cleanedMath = math.trim();
        return katex.renderToString(cleanedMath, { displayMode: false, throwOnError: false });
      } catch (e) {
        console.error("KaTeX error:", e);
        return match;
      }
    });
    
    // 2. Process single dollars: $ ... $
    processed = processed.replace(/\$([^\$]+?)\$/g, (match, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch (e) {
        console.error("KaTeX error:", e);
        return match;
      }
    });
    
    return processed;
  };

  const htmlContent = renderMathInText(children);

  return (
    <span 
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
