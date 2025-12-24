'use client';

import React, { useState, useEffect } from 'react';
import { AIResponse } from '@/components/ui/ai/response';

const tokens = [
  '### Hello',
  ' World',
  '\n\n',
  'This',
  ' is',
  ' a',
  ' **',
  'markdown',
  '**',
  ' response',
  ' from',
  ' an',
  ' AI',
  ' model',
  '.',
  '\n\n',
  '```',
  'javascript',
  '\n',
  'const',
  ' greeting',
  ' = ',
  "'Hello, world!'",
  ';',
  '\n',
  'console',
  '.',
  'log',
  '(',
  'greeting',
  ')',
  ';',
  '\n',
  '```',
  '\n\n',
  "Here's",
  ' a',
  ' [',
  'link',
  '](',
  'https://example.com',
  ')',
  ' and',
  ' some',
  ' more',
  ' text',
  ' with',
  ' a',
  ' list',
  ':',
  '\n\n',
  '-',
  ' Item',
  ' one',
  '\n',
  '-',
  ' Item',
  ' two',
  '\n',
  '-',
  ' Item',
  ' three',
];

export default function AIResponseExample() {
  const [content, setContent] = useState('');

  useEffect(() => {
    let currentContent = '';
    let index = 0;
    const interval = setInterval(() => {
      if (index < tokens.length) {
        currentContent += tokens[index];
        setContent(currentContent);
        index += 1;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <AIResponse>{content}</AIResponse>
    </div>
  );
}
