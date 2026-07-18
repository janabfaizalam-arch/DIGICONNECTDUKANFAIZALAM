"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function OtpInput({ value, onChange, disabled }: Props) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function setDigit(index: number, char: string) {
    const next = value.split("");
    while (next.length < 6) next.push("");
    next[index] = char;
    const joined = next.join("").replace(/\D/g, "").slice(0, 6);
    onChange(joined);
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2" onPaste={(event) => {
      const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (text) {
        event.preventDefault();
        onChange(text);
        inputsRef.current[Math.min(text.length, 5)]?.focus();
      }
    }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[index] === " " ? "" : digits[index]}
          onChange={(event) => {
            const char = event.target.value.replace(/\D/g, "").slice(-1);
            setDigit(index, char);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              inputsRef.current[index - 1]?.focus();
            }
          }}
          className="h-12 w-10 rounded-xl border border-slate-300 bg-white text-center text-lg font-semibold outline-none focus:border-teal-700"
        />
      ))}
    </div>
  );
}
