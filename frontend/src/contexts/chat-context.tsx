'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '@/lib/api';
import { ensureSession } from '@/lib/session';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'customer' | 'agent';
}

interface ChatContextValue {
  messages: ChatMessage[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  sending: boolean;
  sessionReady: boolean;
  businessId: string;
  businessName: string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
  businessId,
  businessName,
}: {
  children: React.ReactNode;
  businessId: string;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', content: `Hi! Welcome to ${businessName}. How can we help you today?`, sender: 'agent' },
  ]);
  const [sending, setSending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    ensureSession(businessId).then(() => setSessionReady(true)).catch(() => setSessionReady(true));
  }, [businessId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), content: content.trim(), sender: 'customer' };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const sessionId = await ensureSession(businessId);
      const res = await sendChatMessage({
        businessId,
        channelType: 'web_chat',
        channelIdentity: sessionId,
        content: content.trim(),
        sessionId,
      });

      if (res.success && res.data?.replyMessage) {
        setMessages((prev) => [...prev, {
          id: res.data!.replyMessage!.id,
          content: res.data!.replyMessage!.content,
          sender: 'agent' as const,
        }]);
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
      sendingRef.current = false;
      setSending(false);
    }
  }, [businessId]);

  return (
    <ChatContext.Provider value={{
      messages,
      isOpen: open,
      setIsOpen: setOpen,
      sendMessage,
      sending,
      sessionReady,
      businessId,
      businessName,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
