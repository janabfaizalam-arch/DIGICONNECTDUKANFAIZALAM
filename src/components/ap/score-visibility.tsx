"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Whether the partner's Score is on screen.
 *
 * A DC Partner works with the customer standing beside them, often with the
 * phone turned around. What they earn on the sale is theirs to know and not
 * the customer's, so Score is **off until the partner switches it on** — on
 * first paint, on a new device, and on every page they open.
 *
 * Off means gone, not masked. A row of dots still tells the customer there is
 * a number being kept from them, which is the conversation the partner was
 * trying to avoid; the figure and its label are simply not rendered.
 *
 * The switch was already on the service catalogue, with its own `useState` and
 * its own read of `digipartner_show_score`. Two copies meant the catalogue and
 * the service detail page could disagree, and no other screen knew about it at
 * all. One provider now holds it for the whole panel, so switching it on
 * anywhere switches it on everywhere, including in another tab.
 */

const STORAGE_KEY = "digipartner_show_score";

type ScoreVisibility = {
  /** True only once the partner has switched Score on. */
  visible: boolean;
  toggle: () => void;
  setVisible: (next: boolean) => void;
};

const ScoreVisibilityContext = createContext<ScoreVisibility | null>(null);

export function ScoreVisibilityProvider({ children }: { children: ReactNode }) {
  /*
    Starts hidden, and that is also what the server renders. Reading storage
    during the first render is not possible on the server anyway, and starting
    from `true` would flash every figure on screen before the effect could
    correct it -- in front of whoever is watching the phone.
  */
  const [visible, setVisibleState] = useState(false);

  useEffect(() => {
    try {
      setVisibleState(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // Private browsing, or storage blocked. Staying hidden is the safe end.
    }
  }, []);

  /* Another tab, or the catalogue's own switch before this provider existed. */
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setVisibleState(event.newValue === "true");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // The switch still works for this page; it just will not be remembered.
    }
  }, []);

  const value = useMemo<ScoreVisibility>(
    () => ({ visible, setVisible, toggle: () => setVisible(!visible) }),
    [visible, setVisible],
  );

  return <ScoreVisibilityContext.Provider value={value}>{children}</ScoreVisibilityContext.Provider>;
}

/**
 * Read the switch.
 *
 * Outside the provider this reports hidden rather than throwing: a screen that
 * forgot to be wrapped should keep the Score off the glass, not crash — and
 * certainly not show it.
 */
export function useScoreVisibility(): ScoreVisibility {
  const context = useContext(ScoreVisibilityContext);
  return (
    context ?? {
      visible: false,
      toggle: () => {},
      setVisible: () => {},
    }
  );
}

/**
 * A figure that only exists when Score is switched on.
 *
 * `fallback` is for the rare place that must keep its shape — a table cell
 * cannot vanish without pulling the row apart. Everywhere else, leave it out
 * and nothing is drawn.
 */
export function Score({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { visible } = useScoreVisibility();
  return <>{visible ? children : fallback}</>;
}

/**
 * A whole region that is nothing but Score.
 *
 * The ledger and its totals are the partner's own cut from first row to last,
 * so there is nothing on those screens to leave behind. Rather than an empty
 * page, the switch is offered in place of the content -- otherwise a partner
 * who has never turned Score on would find the screen broken rather than off.
 */
export function ScoreGate({ children, title = "Score is off" }: { children: ReactNode; title?: string }) {
  const { visible } = useScoreVisibility();
  if (visible) return <>{children}</>;

  return (
    <div className="dcp-card flex flex-col items-start gap-3 p-5">
      <div>
        <p className="text-[15px] font-bold text-[var(--dcp-ink)]">{title}</p>
        <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[var(--dcp-ink-3)]">
          Customer ke saamne screen khuli ho to Score chhupa rehta hai. Dekhne ke liye switch on kijiye.
        </p>
      </div>
      <ScoreToggle />
    </div>
  );
}

/**
 * The switch itself.
 *
 * A labelled switch rather than an eye: an eye is a peek, and this is a
 * setting the partner leaves off all day and turns on when they want to look.
 */
export function ScoreToggle({ className, label = "Score" }: { className?: string; label?: string }) {
  const { visible, toggle } = useScoreVisibility();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      onClick={toggle}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-brand)] focus-visible:ring-offset-1",
        visible
          ? "border-transparent bg-[var(--dcp-good,#047857)] text-white"
          : "border-[var(--dcp-line)] bg-[var(--dcp-surface)] text-[var(--dcp-ink-2)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          visible ? "bg-white/40" : "bg-[var(--dcp-line-2,#c6d4ec)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left]",
            visible ? "left-[14px]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}
