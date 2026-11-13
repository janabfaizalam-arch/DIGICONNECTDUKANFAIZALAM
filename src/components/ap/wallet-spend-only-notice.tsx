import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";

/**
 * Why there is no withdraw button.
 *
 * The wallet buys services; it does not pay out to a bank. A partner who used
 * to withdraw will come looking for the button, so the space it occupied says
 * where the money goes instead rather than going quietly blank.
 */
export function WalletSpendOnlyNotice({ balance }: { balance: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
        <Wallet className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-bold text-emerald-800">Wallet mein {balance} hai</p>
          <p className="text-emerald-700">Ye amount agli service apply karte waqt apne aap kat jata hai.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-500">
        Service complete hone par score wallet mein add hota hai. Jitna wallet mein hai utna kam pay karna
        padta hai — poora price jama ho jaye to kuchh bhi pay nahi karna padta. Bank transfer band hai.
      </p>

      <Link
        href="/ap/applications/new"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-blue-500/10 transition active:scale-[0.98]"
      >
        Wallet se apply kijiye
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
