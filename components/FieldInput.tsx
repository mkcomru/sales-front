import React, { useId } from 'react';

export interface FieldInputProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (val: string) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputType?: 'text' | 'number';
}

export const FieldInput: React.FC<FieldInputProps> = ({
  icon,
  label,
  value,
  onChange,
  onBlur,
  inputType = 'text',
}) => {
  const id = useId();
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur(e);
  };
  return (
    <div className="group relative flex items-start gap-3 p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200">
      <div className="mt-2 text-gray-400 group-hover:text-gray-500 transition-colors shrink-0">{icon}</div>
      <label htmlFor={id} className="flex-1 min-w-0 flex flex-col cursor-text">
        <span className="text-[10px] text-gray-400 font-medium mb-0.5 capitalize">{label}</span>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="field-input w-full bg-transparent border-none p-0 text-[14px] leading-relaxed text-gray-900 font-normal outline-none focus:ring-0 focus:ring-offset-0 placeholder:text-gray-400 caret-gray-900 selection:bg-indigo-100 selection:text-gray-900"
          placeholder="-"
        />
      </label>
    </div>
  );
};
