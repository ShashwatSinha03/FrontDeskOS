'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import { useChat } from '@/contexts/chat-context';
import { cn } from '@/lib/utils';

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export function ChatWidget() {
  const { messages, isOpen, setIsOpen, sendMessage, sending, sessionReady, businessName } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow-sm hover:shadow-md transition-shadow"
          aria-label="Open chat"
        >
          {isOpen ? (
            <X className="h-5 w-5 text-muted-foreground" />
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {businessName.charAt(0)}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="border-b px-4 py-3.5 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
              <span className="text-xs font-semibold">{businessName.charAt(0)}</span>
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold">{businessName}</SheetTitle>
              <p className="text-xs text-muted-foreground">We typically reply in minutes</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 1 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Hi! How can we help you today?
              </p>
            </div>
          )}
          {messages.slice(1).map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.sender === 'customer' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3.5 py-2 text-sm leading-relaxed',
                  msg.sender === 'customer'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm bg-muted">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t px-4 py-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            maxLength={1000}
            disabled={sending || !sessionReady}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg"
            onClick={handleSend}
            disabled={!input.trim() || sending || !sessionReady}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
