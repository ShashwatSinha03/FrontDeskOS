'use client';

import { FC, ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface HighlightCardProps {
  title: string;
  description: string[];
  icon?: ReactNode;
}

export const HighlightCard: FC<HighlightCardProps> = ({ title, description, icon }) => {
  return (
    <div className="group h-full">
      <Card className="product-card h-full text-white rounded-2xl border border-blue-500/5 bg-gradient-to-br from-[#010101] via-[#090909] to-[#010101] shadow-2xl relative backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-blue-500/15 hover:shadow-blue-500/5 hover:shadow-3xl hover:scale-[1.02] hover:-rotate-1 [transform:translateZ(0)]">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/3 to-blue-500/5 opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-gradient-to-tr from-blue-500/5 to-transparent blur-3xl opacity-30 group-hover:opacity-50 transform group-hover:scale-110 transition-all duration-700" />
          <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-blue-500/3 blur-xl" />
          <div className="absolute bottom-16 right-16 w-12 h-12 rounded-full bg-blue-500/3 blur-lg" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/3 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
        </div>

        <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-500/5 to-transparent rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-blue-500/5 to-transparent rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="px-4 pt-3 pb-4 relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-2.5">
            <div className="p-2.5 rounded-full backdrop-blur-lg border border-blue-500/10 bg-gradient-to-br from-black/80 to-black/60 shadow-2xl transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <div className="transform transition-transform duration-700 group-hover:rotate-180">
                {icon}
              </div>
            </div>
          </div>

          <h3 className="mb-1.5 text-sm font-bold bg-gradient-to-r from-blue-400/80 via-blue-300/80 to-blue-400/80 bg-clip-text text-transparent">
            {title}
          </h3>

          <div className="space-y-1 max-w-sm flex-1">
            {description.map((line, idx) => (
              <p
                key={idx}
                className="text-zinc-400 text-sm leading-relaxed transition-colors duration-300 group-hover:text-zinc-300"
              >
                {line}
              </p>
            ))}
          </div>

          <div className="mt-3 w-1/3 h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full transition-all duration-500 group-hover:w-1/2" />

          <div className="flex space-x-1.5 mt-1.5 opacity-40 transition-opacity duration-300 group-hover:opacity-70">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
          </div>
        </div>
      </Card>
    </div>
  );
};
