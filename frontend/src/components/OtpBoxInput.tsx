import React, { useRef, useState, useEffect } from 'react';

interface OtpBoxInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export const OtpBoxInput: React.FC<OtpBoxInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));

  useEffect(() => {
    const newDigits = value.split('').slice(0, length);
    const padded = [...newDigits, ...Array(length - newDigits.length).fill('')];
    setDigits(padded);
  }, [value, length]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const char = val.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    const fullCode = nextDigits.join('');
    onChange(fullCode);

    if (char && index < length - 1) {
      focusInput(index + 1);
    }

    if (fullCode.length === length && !nextDigits.includes('')) {
      onComplete?.(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const pastedDigits = pastedData.slice(0, length).split('');
    const newDigits = [...pastedDigits, ...Array(length - pastedDigits.length).fill('')].slice(0, length);
    setDigits(newDigits);

    const fullCode = newDigits.join('');
    onChange(fullCode);

    const lastIndex = Math.min(pastedDigits.length, length) - 1;
    if (lastIndex >= 0) {
      focusInput(lastIndex);
    }

    if (fullCode.length === length && !newDigits.includes('')) {
      onComplete?.(fullCode);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[idx] || ''}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold font-mono-num rounded-xl border-2 transition-all outline-none ${
            hasError
              ? 'border-error text-error bg-error/5 focus:ring-4 focus:ring-error/15'
              : digits[idx]
              ? 'border-indigo-500 text-text-primary bg-indigo-500/5 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15'
              : 'border-border text-text-primary bg-canvas focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
          }`}
        />
      ))}
    </div>
  );
};
