import { type ReactNode } from 'react';

const inputClass = 'form-checkbox';

type FormCheckboxProps = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
};

export function FormCheckbox({
  id,
  checked,
  onChange,
  title,
  className,
  children,
  disabled,
}: FormCheckboxProps) {
  const labelClass =
    `flex items-center gap-3 select-none group text-gray-600 transition-colors ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer group-hover:text-gray-700'} ${className ?? ''}`.trim();

  return (
    <label className={labelClass} title={title}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={inputClass}
        disabled={disabled}
      />
      {children}
    </label>
  );
}
