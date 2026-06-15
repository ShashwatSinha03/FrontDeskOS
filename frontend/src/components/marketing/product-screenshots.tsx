'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/design/reveal';
import GlitchText from '@/components/GlitchText';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, MessageSquare } from 'lucide-react';

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, content: DashboardMockup },
  { id: 'leads', label: 'Leads', icon: Users, content: LeadsMockup },
  { id: 'appointments', label: 'Appointments', icon: Calendar, content: AppointmentsMockup },
  { id: 'conversation', label: 'Conversations', icon: MessageSquare, content: ConversationMockup },
];

function AnimatedNumber({ target, visible }: { target: number; visible: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const steps = 24;
    let current = 0;
    const timer = setInterval(() => {
      current += target / steps;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span>{value}</span>;
}

function DashboardMockup({ visible }: { visible: boolean }) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-zinc-700" />
        <div className="h-7 w-20 rounded-lg bg-blue-600" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Leads', value: 38, color: 'bg-blue-500' },
          { label: 'Appointments', value: 12, color: 'bg-emerald-500' },
          { label: 'Escalations', value: 3, color: 'bg-amber-500' },
          { label: 'Follow-Ups', value: 7, color: 'bg-violet-500' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
          >
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', stat.color)} />
              <span className="text-[11px] text-zinc-500">{stat.label}</span>
            </div>
            <p className="mt-1.5 text-xl font-semibold text-white">
              <AnimatedNumber target={stat.value} visible={visible} />
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">
          <span>Name</span>
          <span>Service</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {[
          { name: 'Sarah Johnson', service: 'Consultation', date: 'Today', status: 'Confirmed' },
          { name: 'Mike Chen', service: 'Cleaning', date: 'Tomorrow', status: 'Pending' },
        ].map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-4 gap-2 px-3 py-2 text-[11px] text-zinc-300"
          >
            <span>{row.name}</span>
            <span className="text-zinc-500">{row.service}</span>
            <span className="text-zinc-500">{row.date}</span>
            <span
              className={cn(
                'inline-flex w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                row.status === 'Confirmed'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-zinc-500/10 text-zinc-400'
              )}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadsMockup({ visible }: { visible: boolean }) {
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShowNew(true), 1600);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-zinc-700" />
        <div className="flex gap-2">
          <div className="h-7 w-16 rounded-lg border border-zinc-700 bg-zinc-800" />
          <div className="h-7 w-16 rounded-lg bg-blue-600" />
        </div>
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">
          <span>Name</span>
          <span>Service</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {[
          { name: 'Emily Davis', info: 'Consultation', status: 'New', date: '2 min ago' },
          { name: 'James Wilson', info: 'Cleaning', status: 'Contacted', date: '1 hour ago' },
          { name: 'Lisa Park', info: 'Checkup', status: 'Qualified', date: '3 hours ago' },
        ].map((row, i) => (
          <div
            key={row.name}
            className={cn(
              'grid grid-cols-4 gap-2 px-3 py-2 text-[11px] text-zinc-300 transition-all duration-700',
              showNew && i === 0
                ? 'bg-blue-500/10'
                : ''
            )}
          >
            <span>{row.name}</span>
            <span className="text-zinc-500">{row.info}</span>
            <span
              className={cn(
                'inline-flex w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                row.status === 'New' ? 'bg-blue-500/10 text-blue-400' :
                row.status === 'Contacted' ? 'bg-amber-500/10 text-amber-400' :
                'bg-emerald-500/10 text-emerald-400'
              )}
            >
              {row.status}
            </span>
            <span className="text-zinc-500">{row.date}</span>
          </div>
        ))}
      </div>
      {showNew && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-400 transition-all duration-500">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          New lead captured via WhatsApp
        </div>
      )}
    </div>
  );
}

function AppointmentsMockup({ visible }: { visible: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setConfirmed(true), 1000);
    const t2 = setTimeout(() => setCompleted(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-zinc-700" />
        <div className="h-7 w-20 rounded-lg bg-blue-600" />
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="grid grid-cols-3 gap-2 border-b border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">
          <span>Patient</span>
          <span>Time</span>
          <span>Status</span>
        </div>
        {[
          { name: 'Sophia Lee', time: '9:00 AM', status: 'Confirmed' },
          { name: 'David Kim', time: '10:30 AM', status: 'Pending' },
          { name: 'Ana Martinez', time: '2:00 PM', status: 'Completed' },
        ].map((row) => (
          <div
            key={row.name}
            className={cn(
              'grid grid-cols-3 gap-2 px-3 py-2 text-[11px] text-zinc-300 transition-all duration-500',
              (confirmed && row.status === 'Confirmed') ? 'bg-emerald-500/10' : '',
              (completed && row.status === 'Completed') ? 'bg-blue-500/10' : ''
            )}
          >
            <span>{row.name}</span>
            <span className="text-zinc-500">{row.time}</span>
            <span
              className={cn(
                'inline-flex w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                row.status === 'Confirmed'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : row.status === 'Completed'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-zinc-500/10 text-zinc-400'
              )}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversationMockup({ visible }: { visible: boolean }) {
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < 4; i++) {
      timers.push(setTimeout(() => setMessages(i + 1), 200 + i * 900));
    }
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const chatMessages = [
    { sender: 'customer', text: 'Hi, I need to book a teeth cleaning.' },
    { sender: 'ai', text: "I can help with that! We have openings this Thursday at 2pm or Friday at 10am." },
    { sender: 'customer', text: 'Thursday at 2pm works.' },
    { sender: 'ai', text: 'Great! Your cleaning appointment is confirmed for Thursday at 2pm.' },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2 border-b border-zinc-700 pb-3">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
        <div>
          <div className="text-xs font-medium text-white">AI Receptionist</div>
          <div className="text-[10px] text-zinc-500">Online</div>
        </div>
        <div className="ml-auto flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        </div>
      </div>
      <div className="space-y-3">
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              msg.sender === 'customer' ? 'justify-start' : 'justify-end',
              i < messages ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transition: 'opacity 400ms ease-out' }}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed',
                msg.sender === 'customer'
                  ? 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                  : 'rounded-br-sm bg-blue-600 text-white'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {messages > 0 && messages < 4 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-zinc-800 px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenshotWindow({ view, isActive, onClick, visible }: {
  view: typeof VIEWS[number];
  isActive: boolean;
  onClick: () => void;
  visible: boolean;
}) {
  const Content = view.content;
  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-xl border transition-all duration-500',
        isActive
          ? 'border-zinc-600 bg-zinc-900/80'
          : 'border-zinc-800/60 bg-zinc-900/30 opacity-60 hover:opacity-90'
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
        <view.icon className={cn('h-4 w-4', isActive ? 'text-blue-400' : 'text-zinc-500')} />
        <span className={cn('text-xs font-medium', isActive ? 'text-zinc-200' : 'text-zinc-500')}>
          {view.label}
        </span>
      </div>
      <Content visible={visible && isActive} />
    </div>
  );
}

export function ProductScreenshots() {
  const [activeView, setActiveView] = useState('dashboard');
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={ref}
            className={`text-3xl font-bold tracking-tight text-white transition-all duration-700 sm:text-4xl ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Built for businesses wanting systems, not{' '}
            <GlitchText speed={4.1} enableShadows enableOnHover={false} className="inline">
              headaches
            </GlitchText>
            .
          </h2>
          <p
            className={`mt-4 text-base leading-relaxed text-zinc-400 transition-all duration-700 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
            style={{ transitionDelay: visible ? '200ms' : '0ms' }}
          >
            Every screen tied to a business outcome. More leads, more bookings and less admin work.
          </p>
        </div>

        <Reveal delay={200} y={10}>
          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {VIEWS.map((view) => (
              <ScreenshotWindow
                key={view.id}
                view={view}
                isActive={activeView === view.id}
                onClick={() => setActiveView(view.id)}
                visible={visible}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
