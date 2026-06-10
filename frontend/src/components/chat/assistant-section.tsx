'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Calendar, Clock, Sparkles, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/chat-context';

const QUICK_ACTIONS = [
  { label: 'Book Appointment', message: 'I\'d like to book an appointment' },
  { label: 'Services', message: 'What services do you offer?' },
  { label: 'Hours', message: 'What are your business hours?' },
  { label: 'Insurance', message: 'Do you accept insurance?' },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Powered Answers',
    description: 'Get instant, intelligent responses to all your questions about our services, hours, and more.',
  },
  {
    icon: Calendar,
    title: 'Instant Booking',
    description: 'Schedule your appointment right here in the chat without waiting on hold.',
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Our AI assistant is here to help you anytime, day or night.',
  },
];

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

  const handleQuickAction = (message: string) => {
    setInput(message);
    if (!showChat) setShowChat(true);
  };

  const handleSendQuickAction = async (message: string) => {
    if (!showChat) setShowChat(true);
    await sendMessage(message);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Bot className="h-4 w-4" />
            AI Assistant
          </div>
          <h2 className="text-4xl font-bold tracking-tight">
            Questions?{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Ask Away.
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get instant answers, book appointments, and learn more about {businessName} — all without picking up the phone.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ animation: `fadeInUp 0.6s ease-out ${i * 0.15}s both` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
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
                className="rounded-full transition-all hover:bg-primary hover:text-primary-foreground"
                onClick={() => handleSendQuickAction(qa.message)}
                disabled={sending || !sessionReady}
              >
                {qa.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="rounded-2xl border bg-card shadow-sm">
            <div
              className="flex cursor-pointer items-center justify-between border-b px-6 py-4 transition-colors hover:bg-muted/50"
              onClick={() => setShowChat(!showChat)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Chat with {businessName}</span>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {messages.length - 1} message{messages.length - 1 !== 1 ? 's' : ''}
                  </span>
                )}
                <svg
                  className={`h-5 w-5 text-muted-foreground transition-transform ${showChat ? 'rotate-180' : ''}`}
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
                <div className="h-72 overflow-y-auto px-6 py-4 space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                      style={{ animation: i > 0 ? `fadeIn 0.3s ease-out both` : undefined }}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.sender === 'customer'
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                        <span className="inline-flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t px-6 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      maxLength={1000}
                      disabled={sending || !sessionReady}
                      className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-xl"
                      onClick={handleSend}
                      disabled={!input.trim() || sending || !sessionReady}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-xl"
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
