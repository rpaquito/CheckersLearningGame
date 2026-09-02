'use client';

import { ACTIVE_TOGGLE_STYLE } from '@/lib/ui/activeToggleStyle';

export interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface ToggleGroupProps<T extends string> {
  legend: string;
  options: ToggleGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A group of toggle buttons (difficulty/color, etc.) -- generic over the
 * option value type so any page can reuse it without a chess/checkers
 * dependency. The caller is free to add its own logic (e.g. /opcoes calls
 * `updateSettings` + `toast.show(...)` inside its own `onChange`) -- this
 * component knows nothing about that.
 */
export function ToggleGroup<T extends string>({ legend, options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium mb-1 text-white">{legend}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            style={value === option.value ? ACTIVE_TOGGLE_STYLE : undefined}
            className={`flex-1 rounded-xl border-2 px-3 py-2 capitalize font-semibold transition-transform hover:scale-[1.02] ${
              value === option.value
                ? 'border-transparent shadow-[3px_3px_0_rgba(0,0,0,0.35)]'
                : 'border-purple/40 text-lilac'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
