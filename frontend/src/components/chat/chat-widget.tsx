'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, X } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';
import { ensureSession } from '@/lib/session';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'customer' | 'agent';
}

export function ChatWidget({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', content: `Hi! Welcome to ${businessName}. How can we help you today?`, sender: 'agent' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureSession(businessId).then(() => setSessionReady(true)).catch(() => setSessionReady(true));
  }, [businessId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), content, sender: 'customer' };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const sessionId = await ensureSession(businessId);
      const res = await sendChatMessage({
        businessId,
        channelType: 'web_chat',
        channelIdentity: sessionId,
        content,
        sessionId,
      });

      if (res.success && res.data?.replyMessage) {
        const agentMsg: ChatMessage = {
          id: res.data.replyMessage.id,
          content: res.data.replyMessage.content,
          sender: 'agent',
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          content: "Sorry, I'm having trouble connecting. Please try again later.",
          sender: 'agent',
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        content: "Sorry, something went wrong. Please try again.",
        sender: 'agent',
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Open chat"
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-lg">{businessName} Chat</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  msg.sender === 'customer'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted text-muted-foreground">
                <span className="animate-pulse">Typing...</span>
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
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending || !sessionReady}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
