import React, { useState, useCallback } from 'react';
import { Target } from 'lucide-react';
import type { CompanyField } from '../../types';
import { FieldInput } from '../FieldInput';
import { valuesEqual } from '../../utils/fieldValue';

type FieldValue = string | number | boolean | null;

interface CustomerFieldsEditorProps {
  title?: string;
  fields: CompanyField[];
  values: Record<string, FieldValue>;
  onFieldChange?: (key: string, value: FieldValue) => void;
}

export const CustomerFieldsEditor: React.FC<CustomerFieldsEditorProps> = ({
  title = 'Данные клиента',
  fields,
  values,
  onFieldChange,
}) => {
  const [localValues, setLocalValues] = useState<Record<string, FieldValue>>({ ...values });

  const updateLocal = useCallback((key: string, value: FieldValue) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const commitField = useCallback(
    (key: string, value: FieldValue) => {
      if (!onFieldChange) return;
      if (valuesEqual(values[key], value)) return;
      onFieldChange(key, value);
    },
    [values, onFieldChange]
  );

  const readOnly = !onFieldChange;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
      </div>

      {fields.length === 0 && (
        <div className="text-[13px] text-gray-400 italic py-2">Нет данных</div>
      )}

      {fields.map((field) => {
        const rawValue = localValues[field.name] ?? values[field.name];
        const label = `${field.display_name || field.name}${field.is_system ? ' (system)' : ''}`;

        if (readOnly) {
          const display = rawValue == null || rawValue === '' ? '—' : String(rawValue);
          if (field.type === 'boolean') {
            const boolDisplay = rawValue === true || rawValue === 'true' ? 'Да' : rawValue === false || rawValue === 'false' ? 'Нет' : '—';
            return <ReadOnlyField key={field.id} label={label} value={boolDisplay} />;
          }
          return <ReadOnlyField key={field.id} label={label} value={display} />;
        }

        return (
          <div key={field.id} className="mb-1">
            {field.type === 'boolean' ? (
              <BooleanField
                label={label}
                value={rawValue}
                onChange={(val) => {
                  updateLocal(field.name, val);
                  commitField(field.name, val);
                }}
              />
            ) : field.type === 'number' ? (
              <FieldInput
                icon={<Target size={14} />}
                label={label}
                value={rawValue != null && rawValue !== '' ? String(rawValue) : ''}
                onChange={(v) => updateLocal(field.name, v)}
                onBlur={(e) => {
                  const raw = e.target.value;
                  commitField(field.name, raw === '' ? null : (Number(raw) || raw));
                }}
                inputType="number"
              />
            ) : field.type === 'select' || field.type === 'enum' ? (
              <SelectField
                label={label}
                value={rawValue}
                options={field.options ?? []}
                onChange={(val) => {
                  updateLocal(field.name, val);
                  commitField(field.name, val);
                }}
              />
            ) : (
              <FieldInput
                icon={<Target size={14} />}
                label={label}
                value={rawValue != null ? String(rawValue) : ''}
                onChange={(v) => updateLocal(field.name, v)}
                onBlur={(e) => {
                  const v = e.target.value;
                  commitField(field.name, v === '' ? null : v);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const ReadOnlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <span className="text-[12px] text-gray-400 flex-shrink-0">{label}</span>
    <span className="text-[12px] text-gray-900 font-medium text-right truncate">{value}</span>
  </div>
);

const BooleanField: React.FC<{
  label: string;
  value: FieldValue;
  onChange: (val: boolean | null) => void;
}> = ({ label, value, onChange }) => (
  <div className="group relative flex items-start gap-3 p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">
    <div className="mt-2 text-gray-400"><Target size={14} /></div>
    <div className="flex-1">
      <div className="text-[10px] text-gray-400 font-medium mb-0.5 uppercase">{label}</div>
      <select
        value={
          value === true || value === 'true' ? 'true'
            : value === false || value === 'false' ? 'false'
            : ''
        }
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : v === 'true');
        }}
        className="w-full bg-transparent border-none p-0 text-[13px] text-gray-900 font-normal focus:ring-0 cursor-pointer"
      >
        <option value="">—</option>
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: FieldValue;
  options: Array<{ id: number; value: string }>;
  onChange: (val: string | null) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="group relative flex items-start gap-3 p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">
    <div className="mt-2 text-gray-400"><Target size={14} /></div>
    <div className="flex-1">
      <div className="text-[10px] text-gray-400 font-medium mb-0.5 uppercase">{label}</div>
      <select
        value={value != null && value !== '' ? String(value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : v);
        }}
        className="w-full bg-transparent border-none p-0 text-[13px] text-gray-900 font-normal focus:ring-0 cursor-pointer"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.value}>{opt.value}</option>
        ))}
      </select>
    </div>
  </div>
);
