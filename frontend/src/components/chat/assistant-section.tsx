'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Calendar, Clock, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/chat-context';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { label: 'Book Appointment', message: 'I\'d like to book an appointment' },
  { label: 'Services', message: 'What services do you offer?' },
  { label: 'Hours', message: 'What are your business hours?' },
  { label: 'Contact', message: 'How can I contact you?' },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Powered Answers',
    description: 'Instant, intelligent responses to your questions.',
  },
  {
    icon: Calendar,
    title: 'Instant Booking',
    description: 'Schedule your appointment right in the chat.',
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Help whenever you need it, day or night.',
  },
];

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export function AiAssistant() {
  const { messages, sendMessage, sending, sessionReady, businessName, setIsOpen: setChatOpen } = useChat();
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    if (!showChat) setShowChat(true);
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendQuickAction = async (message: string) => {
    if (!showChat) setShowChat(true);
    await sendMessage(message);
  };

  return (
    <section className="border-t py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            AI Assistant
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Questions? Ask Away.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Get instant answers, book appointments, and learn more about {businessName} &mdash; all without picking up the phone.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-5"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {QUICK_ACTIONS.map((qa) => (
              <Button
                key={qa.label}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handleSendQuickAction(qa.message)}
                disabled={sending || !sessionReady}
              >
                {qa.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="rounded-lg border bg-card">
            <div
              className="flex cursor-pointer items-center justify-between border-b px-5 py-3.5 transition-colors hover:bg-muted/30"
              onClick={() => setShowChat(!showChat)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-background">
                  <span className="text-[10px] font-semibold">{businessName.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium">Chat with {businessName}</span>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {messages.length - 1} message{messages.length - 1 !== 1 ? 's' : ''}
                  </span>
                )}
                <svg
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    showChat && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showChat && (
              <>
                <div className="h-72 overflow-y-auto px-5 py-4 space-y-3">
                  {messages.map((msg) => (
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
                      <div className="max-w-[80%] rounded-lg bg-muted px-3.5 py-2.5 text-sm">
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      maxLength={1000}
                      disabled={sending || !sessionReady}
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg"
                      onClick={handleSend}
                      disabled={!input.trim() || sending || !sessionReady}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg"
                      onClick={() => setChatOpen(true)}
                      title="Open full chat"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
