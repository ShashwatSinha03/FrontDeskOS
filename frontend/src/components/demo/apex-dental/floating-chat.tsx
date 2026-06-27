'use client';

import { useState, useCallback } from 'react';
import { useDemo } from '@/lib/demo/stores/demo-provider';
import { ConversationEngine } from '@/lib/demo/engine/conversation-engine';
import type { ConversationState } from '@/lib/demo/engine/conversation-engine';
import { MessageSquare, X } from 'lucide-react';

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConversationState | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { bus } = useDemo();
  const [engine] = useState(() => new ConversationEngine(bus));

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!state) {
      const initial = engine.start();
      setState(initial);
    }
  }, [engine, state]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setState(prev => prev ? { ...prev, isThinking: true, messages: [...prev.messages, { id: crypto.randomUUID(), role: 'customer', content: msg, timestamp: Date.now() }] } : prev);
    const next = await engine.processInput(msg);
    setState(next);
    setSending(false);
  }, [input, sending, engine]);

  return (
    <>
      <button
        id="demo-chat-toggle"
        onClick={handleOpen}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-500"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-30 flex h-[500px] w-[380px] flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl border-b border-zinc-700 bg-zinc-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">A</div>
              <div>
                <p className="text-sm font-semibold text-white">Apex Dental AI</p>
                <p className="text-xs text-green-400">Online</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {state?.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'customer'
                    ? 'rounded-br-sm bg-blue-600 text-white'
                    : 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {state?.isThinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {state?.quickReplies && state.quickReplies.length > 0 && !sending && (
            <div className="flex flex-wrap gap-2 border-t border-zinc-800 px-4 py-2">
              {state.quickReplies.map((qr) => (
                <button
                  key={qr}
                  onClick={async () => {
                    setSending(true);
                    setState(prev => prev ? { ...prev, isThinking: true, messages: [...prev.messages, { id: crypto.randomUUID(), role: 'customer', content: qr, timestamp: Date.now() }] } : prev);
                    const next = await engine.processInput(qr);
                    setState(next);
                    setSending(false);
                  }}
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-zinc-800 p-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
