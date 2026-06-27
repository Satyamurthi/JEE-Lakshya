import { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  children: string;
  className?: string;
}

const MathText: FC<MathTextProps> = ({ children, className = '' }) => {
  const renderMathInText = (text: string): string => {
    if (!text) return '';
    
    // 1. Process double dollars: $$ ... $$
    // We render them as inline math (displayMode: false) if they are in the middle of a sentence
    // or as display math (displayMode: true) if they are on a line by themselves or represent large equations.
    let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      try {
        const cleanedMath = math.trim();
        // Render double dollars as inline math for styling alignment inside paragraphs/buttons
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
