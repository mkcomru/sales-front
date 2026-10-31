import React from 'react';
import { Bot } from 'lucide-react';

export const AiTypingBubble: React.FC = () => (
  <div className="flex w-full justify-end">
    <div className="inline-flex max-w-[78%] sm:max-w-[80%] items-center gap-2.5 rounded-2xl border border-gray-200 bg-sidebar px-4 py-2.5 text-secondary shadow-sm">
      <Bot size={16} className="text-accent flex-shrink-0" />
      <span className="text-[13px] font-medium text-primary">AI готовит ответ</span>
      <span className="flex gap-0.5" aria-hidden>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
      </span>
    </div>
  </div>
);
