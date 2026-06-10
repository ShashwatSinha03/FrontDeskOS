'use client';

import { Message } from '@/types';
import { useEffect, useRef } from 'react';

export function ConversationViewer({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No conversation history available.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto px-1">
      {messages.map((msg) => {
        const isCustomer = msg.sender === 'customer';
        const isAgent = msg.sender === 'agent' || msg.sender === 'human_owner';

        return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isCustomer
                    ? 'bg-muted text-foreground rounded-bl-sm'
                    : isAgent
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-br-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    isAgent ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {msg.sender === 'customer' && ' • Customer'}
                  {msg.sender === 'agent' && ' • AI'}
                  {msg.sender === 'human_owner' && ' • You'}
                </p>
              </div>
            </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
