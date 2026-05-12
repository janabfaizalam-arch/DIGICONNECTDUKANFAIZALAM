import { Wifi } from "lucide-react";

import type { CreditCardOffer } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

const themeClasses: Record<CreditCardOffer["theme"], string> = {
  hdfc: "from-[#071c4d] via-[#104aa4] to-[#021027]",
  swiggy: "from-[#f97316] via-[#fb923c] to-[#7c2d12]",
  tata: "from-[#23123f] via-[#5b21b6] to-[#0f1023]",
  rupay: "from-[#063b86] via-[#2563eb] to-[#061b42]",
  pixel: "from-[#08080b] via-[#27272a] to-[#000000]",
  axis: "from-[#3b0625] via-[#86198f] to-[#140414]",
  yes: "from-[#071a3d] via-[#0f4c81] to-[#02111f]",
  indusind: "from-[#25160a] via-[#a16207] to-[#0f0a05]",
};

const accentClasses: Record<CreditCardOffer["theme"], string> = {
  hdfc: "bg-blue-300/22",
  swiggy: "bg-orange-100/22",
  tata: "bg-fuchsia-200/18",
  rupay: "bg-sky-200/22",
  pixel: "bg-white/12",
  axis: "bg-pink-200/18",
  yes: "bg-cyan-200/18",
  indusind: "bg-amber-200/22",
};

export function CreditCardVisual({
  card,
  size = "default",
  className,
}: {
  card: CreditCardOffer;
  size?: "default" | "large";
  className?: string;
}) {
  const isLarge = size === "large";

  return (
    <div
      className={cn(
        "credit-card-visual relative isolate aspect-[1.586/1] w-full overflow-hidden rounded-xl bg-gradient-to-br text-white shadow-[0_22px_45px_rgba(15,23,42,0.24)] ring-1 ring-white/20",
        themeClasses[card.theme],
        isLarge ? "max-w-[34rem] p-6 md:p-7" : "p-4",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(255,255,255,0.28),transparent_28%,rgba(255,255,255,0.08)_54%,transparent_72%)]" />
      <div className={cn("absolute -right-14 -top-14 -z-10 h-36 w-36 rounded-full blur-sm", accentClasses[card.theme])} />
      <div className={cn("absolute -bottom-20 left-8 -z-10 h-44 w-44 rounded-full blur-md", accentClasses[card.theme])} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("font-extrabold uppercase tracking-[0.14em] text-white/82", isLarge ? "text-sm" : "text-[10px]")}>{card.bankName}</p>
          <p className={cn("mt-1 max-w-[13rem] font-bold leading-tight text-white", isLarge ? "text-2xl md:text-3xl" : "text-base")}>{card.name}</p>
        </div>
        <Wifi className={cn("rotate-90 text-white/72", isLarge ? "h-7 w-7" : "h-5 w-5")} />
      </div>

      <div className={cn("mt-7 flex items-center gap-4", isLarge ? "md:mt-10" : "")}>
        <div className={cn("relative overflow-hidden rounded-md bg-[linear-gradient(135deg,#fff7cc,#d6a23a_48%,#fff0a3)] shadow-inner", isLarge ? "h-10 w-14" : "h-8 w-11")}>
          <div className="absolute inset-y-0 left-1/2 w-px bg-amber-900/30" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-amber-900/30" />
        </div>
        <div className="grid gap-1">
          <span className="h-1.5 w-10 rounded-full bg-white/40" />
          <span className="h-1.5 w-7 rounded-full bg-white/24" />
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 md:inset-x-6 md:bottom-5">
        <div>
          <p className={cn("font-mono tracking-[0.22em] text-white/86", isLarge ? "text-sm" : "text-[10px]")}>4582  ••••  ••••  9026</p>
          <p className={cn("mt-2 font-semibold uppercase tracking-[0.14em] text-white/58", isLarge ? "text-xs" : "text-[9px]")}>DigiConnect Dukan</p>
        </div>
        <p className={cn("font-black italic tracking-tight text-white", isLarge ? "text-2xl" : "text-lg")}>{card.cardNetwork}</p>
      </div>
    </div>
  );
}
