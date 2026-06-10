import { DemoContent } from '@/lib/marketing-content';

export function DemoSection({ headline, messages }: DemoContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {headline}
        </h2>

        <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </div>
            <span className="ml-2 text-xs text-zinc-500">AI Receptionist</span>
          </div>

          <div className="mt-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.sender === 'customer'
                      ? 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                      : 'rounded-br-sm bg-blue-600 text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
