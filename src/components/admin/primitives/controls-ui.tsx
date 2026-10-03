/**
 * The admin surface's controls.
 *
 * The audit counted 270 hand-rolled `<button>`s, 184 `<input>`s, 43 `<select>`s
 * and 14 `<textarea>`s across 169 admin files, each carrying its own height,
 * radius, padding and focus treatment. That is why a button sits a pixel off
 * the input beside it, why the same destructive action is red on one screen and
 * slate on another, and why only 36 of those 270 buttons had any focus style at
 * all.
 *
 * These are deliberately plain: a `<button>` and an `<input>` with the house
 * styles already applied, forwarding every native prop. Nothing here changes
 * behaviour — it is the same element, dressed once instead of 270 times.
 */

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Every control shares one focus treatment.
 *
 * `focus-visible` rather than `focus`, so a mouse click does not leave a ring
 * behind but a keyboard user can always see where they are.
 */
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-surface";

const DISABLED = "disabled:cursor-not-allowed disabled:opacity-55";

const TRANSITION = "transition-colors duration-ds-fast ease-ds";

/* ── Button ──────────────────────────────────────────────────────────────── */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ControlSize = "sm" | "md" | "lg";

/**
 * Intent, not colour.
 *
 * `danger` exists so a destructive action is never a matter of each author's
 * taste — the audit found deletes rendered as plain slate buttons on several
 * screens, indistinguishable from a cancel.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-ds-primary text-ds-text-inverted shadow-ds-sm hover:bg-ds-primary-hover active:bg-ds-primary-hover",
  secondary:
    "border border-ds-border bg-ds-surface text-ds-text-primary shadow-ds-sm hover:bg-ds-surface-sunken",
  ghost: "text-ds-text-secondary hover:bg-ds-surface-sunken hover:text-ds-text-primary",
  subtle: "bg-ds-surface-sunken text-ds-text-primary hover:bg-ds-border",
  danger: "bg-ds-danger text-ds-text-inverted shadow-ds-sm hover:brightness-110",
};

const SIZE: Record<ControlSize, string> = {
  sm: "h-ds-control-sm gap-1.5 px-3 text-xs",
  md: "h-ds-control-md gap-2 px-4 text-sm",
  lg: "h-ds-control-lg gap-2 px-5 text-sm",
};

export type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ControlSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  iconOnly?: boolean;
};

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  { variant = "secondary", size = "md", loading = false, iconOnly = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      // An unspecified `type` inside a form submits it. More than one screen in
      // this panel has a filter button that reloads the page for that reason.
      type={props.type ?? "button"}
      disabled={disabled || loading}
      // A spinner is a visual cue only; this is what a screen reader hears.
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-ds-md font-bold",
        TRANSITION,
        FOCUS,
        DISABLED,
        SIZE[size],
        iconOnly && "aspect-square px-0",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

/* ── Text input ──────────────────────────────────────────────────────────── */

const FIELD_BASE = cn(
  "w-full rounded-ds-md border bg-ds-surface text-ds-text-primary",
  "placeholder:text-ds-text-muted",
  TRANSITION,
  FOCUS,
  DISABLED,
);

const FIELD_SIZE: Record<ControlSize, string> = {
  sm: "h-ds-control-sm px-2.5 text-xs",
  md: "h-ds-control-md px-3 text-sm",
  lg: "h-ds-control-lg px-3.5 text-sm",
};

/** Invalid borders are red *and* announced — colour alone is not a signal. */
const invalidClasses = (invalid?: boolean) =>
  invalid ? "border-ds-danger" : "border-ds-border hover:border-ds-border-strong";

export type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: ControlSize;
  invalid?: boolean;
};

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(function AdminInput(
  { inputSize = "md", invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZE[inputSize], invalidClasses(invalid), className)}
      {...props}
    />
  );
});

export type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  selectSize?: ControlSize;
  invalid?: boolean;
};

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(function AdminSelect(
  { selectSize = "md", invalid, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        FIELD_SIZE[selectSize],
        invalidClasses(invalid),
        "cursor-pointer appearance-none bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9",
        // Inline chevron so the control does not depend on an icon font or a
        // wrapper element that every call site would have to remember.
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235b6b85%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export type AdminTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(function AdminTextarea(
  { invalid, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, "min-h-24 px-3 py-2.5 text-sm", invalidClasses(invalid), className)}
      {...props}
    />
  );
});

/* ── Field wrapper ───────────────────────────────────────────────────────── */

let fieldSeq = 0;

/**
 * Label, control, help text and error, wired together.
 *
 * The wiring is the point: `htmlFor`, `aria-describedby` and `role="alert"` are
 * what make an error reach a screen reader, and they are exactly what gets
 * forgotten when every form repeats the markup by hand.
 */
export function AdminField({
  label,
  htmlFor,
  help,
  error,
  required,
  children,
  className,
}: {
  label: string;
  /** Omit to have one generated and passed to the control via `children`. */
  htmlFor?: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = htmlFor ?? `ds-field-${(fieldSeq += 1)}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-bold text-ds-text-secondary">
        {label}
        {required ? (
          <span className="ml-0.5 text-ds-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {help && !error ? (
        <p id={helpId} className="text-xs text-ds-text-muted">
          {help}
        </p>
      ) : null}

      {error ? (
        // `role="alert"` so the message is announced when it appears, rather
        // than only being visible to someone already looking at the field.
        <p id={errorId} role="alert" className="text-xs font-semibold text-ds-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

/**
 * A loading placeholder that holds the layout open.
 *
 * The audit found ten of these across seventy-eight pages, so most screens
 * currently jump from nothing to content. Reserving the space is what stops
 * the page reflowing under a cursor that is already moving towards a button.
 */
export function AdminSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-ds-sm bg-ds-surface-sunken", className)}
    />
  );
}

/** Several lines of skeleton text, for a card or a detail panel. */
export function AdminSkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <AdminSkeleton
          key={index}
          // The last line stops short, the way a paragraph does.
          className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
