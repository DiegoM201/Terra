import React from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, title }) => {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e1e] shadow-lg my-4">
      {title && (
        <div className="bg-gray-800 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-700 flex justify-between items-center">
          <span>{title}</span>
          <span className="uppercase text-gray-500">{language}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  );
};