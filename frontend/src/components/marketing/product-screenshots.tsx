'use client';

import React, { useEffect, useRef, useState } from 'react';
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
    const timer = setTimeout(() => setShowNew(true), 1600);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-zinc-700" />
        {showNew && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 transition-all duration-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            New lead captured
          </div>
        )}
      </div>
      <div className="space-y-2">
        {[
          { name: 'Emily Davis', email: 'emily@example.com', state: 'New Inquiry', level: 'info' },
          { name: 'James Wilson', email: 'james@example.com', state: 'Qualified', level: 'success' },
          { name: 'Lisa Park', email: 'lisa@example.com', state: 'Booked', level: 'primary' },
          { name: 'Tom Bradley', email: 'tom@example.com', state: 'Lost', level: 'muted' },
        ].map((lead) => (
          <div
            key={lead.name}
            className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-white">{lead.name}</p>
              <p className="text-[11px] text-zinc-500">{lead.email}</p>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                lead.level === 'info' && 'bg-blue-500/10 text-blue-400',
                lead.level === 'success' && 'bg-emerald-500/10 text-emerald-400',
                lead.level === 'primary' && 'bg-violet-500/10 text-violet-400',
                lead.level === 'muted' && 'bg-zinc-500/10 text-zinc-400'
              )}
            >
              {lead.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentsMockup({ visible }: { visible: boolean }) {
  const [confirmedIndex, setConfirmedIndex] = useState(-1);
  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setConfirmedIndex(0), 1000);
    const t2 = setTimeout(() => setConfirmedIndex(1), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  const rows = [
    { name: 'Anna K.', service: 'Deep Clean', time: '9:00 AM', status: 'Confirmed' as const, animDelay: 1000 },
    { name: 'Rob M.', service: 'Checkup', time: '10:30 AM', status: 'Confirmed' as const, animDelay: 2000 },
    { name: 'Jenna L.', service: 'Consultation', time: '2:00 PM', status: 'Pending' as const, animDelay: 3000 },
    { name: 'David R.', service: 'Follow-up', time: '3:30 PM', status: 'Cancelled' as const, animDelay: 0 },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-zinc-700" />
        <div className="h-8 w-36 rounded-lg bg-blue-600 px-3 text-xs text-white flex items-center justify-center font-medium">
          + Book Appointment
        </div>
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">
          <span>Customer</span>
          <span>Service</span>
          <span>Time</span>
          <span>Status</span>
        </div>
        {rows.map((appt, i) => (
          <div
            key={appt.name}
            className={cn(
              'grid grid-cols-4 gap-2 px-3 py-2 text-[11px] text-zinc-300',
              confirmedIndex === i && 'bg-emerald-500/5'
            )}
          >
            <span>{appt.name}</span>
            <span className="text-zinc-500">{appt.service}</span>
            <span className="text-zinc-500">{appt.time}</span>
            <span
              className={cn(
                'inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all duration-700',
                appt.status === 'Confirmed' && 'bg-emerald-500/10 text-emerald-400',
                appt.status === 'Pending' && 'bg-amber-500/10 text-amber-400',
                appt.status === 'Cancelled' && 'bg-red-500/10 text-red-400',
                visible && confirmedIndex === i && 'translate-x-0 opacity-100',
                visible && confirmedIndex !== i && confirmedIndex >= 0 && 'opacity-100'
              )}
            >
              {appt.status}
              {confirmedIndex === i && visible && (
                <svg className="h-2.5 w-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversationMockup({ visible }: { visible: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const timers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= 6; i++) {
      timers.push(setTimeout(() => setVisibleCount(i), i * 900));
    }
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const messages = [
    { sender: 'customer', text: 'Hi, how much is a teeth whitening session?' },
    { sender: 'ai', text: 'Our whitening treatments start at $350. Would you like to book a consultation?' },
    { sender: 'customer', text: 'Yes, do you have anything this week?' },
    { sender: 'ai', text: 'We have Thursday at 2pm or Friday at 10am. Which works best?' },
    { sender: 'customer', text: 'Friday at 10am works.' },
    { sender: 'ai', text: "Great! I've booked you for Friday at 10am. You'll receive a confirmation. See you then!" },
  ];

  return (
    <div className="flex flex-col p-4 sm:p-6">
      <div className="flex items-center gap-2 border-b border-zinc-700 pb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
          <span className="text-[10px] font-bold text-white">AI</span>
        </div>
        <div>
          <p className="text-xs font-medium text-white">AI Receptionist</p>
          <p className="text-[10px] text-emerald-400">Online</p>
        </div>
      </div>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex transition-all duration-500',
              msg.sender === 'customer' ? 'justify-start' : 'justify-end',
              visibleCount > i ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
            style={{ transitionDelay: visible ? `${i * 900}ms` : '0ms' }}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed',
                msg.sender === 'customer'
                  ? 'rounded-bl-sm bg-zinc-800 text-zinc-300'
                  : 'rounded-br-sm bg-blue-600 text-white'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {visible && visibleCount < 6 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" style={{ animationDelay: '200ms' }} />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
        <span className="flex-1 text-[11px] text-zinc-500">Type a message...</span>
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ScreenshotWindow({
  view,
  isActive,
  onClick,
  visible,
}: {
  view: (typeof VIEWS)[number];
  isActive: boolean;
  onClick: () => void;
  visible: boolean;
}) {
  const Content = view.content;
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border transition-all duration-200',
        isActive
          ? 'border-blue-500/50 ring-1 ring-blue-500/20'
          : 'border-zinc-800 hover:border-zinc-700'
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-2">
        <div className="flex gap-1">
          <div className={cn('h-2 w-2 rounded-full', isActive ? 'bg-blue-500' : 'bg-zinc-700')} />
          <div className={cn('h-2 w-2 rounded-full', isActive ? 'bg-blue-500' : 'bg-zinc-700')} />
          <div className={cn('h-2 w-2 rounded-full', isActive ? 'bg-blue-500' : 'bg-zinc-700')} />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {React.createElement(view.icon, { className: cn('h-3 w-3', isActive ? 'text-blue-400' : 'text-zinc-600') })}
          <span className={cn('text-[10px]', isActive ? 'text-zinc-400' : 'text-zinc-600')}>
            {view.label}
          </span>
        </div>
      </div>
      <Content visible={visible} />
    </button>
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

      </div>
    </section>
  );
}
