'use client';

import TiltedCard from '@/components/TiltedCard';
import { FounderContent } from '@/lib/marketing-content';

export function BuiltBySection({ headline, name, title, story }: FounderContent) {
  return (
    <section className="border-t border-zinc-800 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {headline}
        </h2>
        <div className="mx-auto mt-16 flex justify-center">
          <TiltedCard
            containerHeight="420px"
            containerWidth="420px"
            imageHeight="420px"
            imageWidth="420px"
            rotateAmplitude={15}
            scaleOnHover={1.05}
            showMobileWarning={false}
            showTooltip={false}
            displayOverlayContent
            overlayContent={
              <div className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-3 py-2 text-right text-white backdrop-blur-sm">
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-zinc-400">{title}</p>
              </div>
            }
          >
            <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-gradient-to-br from-zinc-800 to-zinc-900 p-8">
              <p className="text-center text-sm leading-relaxed text-zinc-300">
                {story}
              </p>
            </div>
          </TiltedCard>
        </div>
      </div>
    </section>
  );
}
