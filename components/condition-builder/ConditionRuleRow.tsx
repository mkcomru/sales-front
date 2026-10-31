import React from 'react';
import { Trash2, GitBranch, CheckSquare } from 'lucide-react';
import type { CompanyField, StageTemplate } from '../../types/api';
import type { BuilderRule } from './types';
import {
  FIELD_OPERATORS,
  NUMERIC_OPERATORS,
  STRING_OPERATORS,
  BOOLEAN_OPERATORS,
  ENUM_OPERATORS,
  SPECIAL_FIELDS,
} from './types';

const CONVERT_TO_GROUP = '__group__';

interface ConditionRuleRowProps {
  rule: BuilderRule;
  fields: CompanyField[];
  stages: StageTemplate[];
  canNest: boolean;
  onChange: (updated: BuilderRule) => void;
  onConvertToGroup: () => void;
  onRemove: () => void;
}

type FieldType = 'string' | 'number' | 'boolean' | 'enum';

function getFieldType(field: CompanyField): FieldType {
  const t = field.type?.toLowerCase();
  if (t === 'number' || t === 'integer' || t === 'float') return 'number';
  if (t === 'boolean' || t === 'bool') return 'boolean';
  if (t === 'enum' || t === 'select' || (field.options && field.options.length > 0)) return 'enum';
  return 'string';
}

function allowedOperators(fieldType: FieldType): readonly string[] {
  switch (fieldType) {
    case 'number': return NUMERIC_OPERATORS;
    case 'boolean': return BOOLEAN_OPERATORS;
    case 'enum': return ENUM_OPERATORS;
    default: return STRING_OPERATORS;
  }
}

const labelUi =
  'text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1';
const inputBase =
  'w-full px-3 py-2 rounded-xl bg-neutral-50 ring-1 ring-black/[0.06] text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:bg-white transition-colors';

export const ConditionRuleRow: React.FC<ConditionRuleRowProps> = ({
  rule,
  fields,
  stages,
  canNest,
  onChange,
  onConvertToGroup,
  onRemove,
}) => {
  const isSpecial = rule.field.startsWith('$');
  const isStageCompleted = rule.field === '$stage_completed';
  const isPrevStage = rule.field === '$prev_stage_completed';
  const isAny = rule.field === '$any';

  const companyField = !isSpecial
    ? fields.find(f => `${f.level}_fields.${f.name}` === rule.field)
    : undefined;
  const fieldType = companyField ? getFieldType(companyField) : 'string';
  const operators = allowedOperators(fieldType);
  const isExistsOp = rule.operator === '$exists';

  const fieldOptions = React.useMemo(() => {
    const customerFields = fields.filter(f => f.level === 'customer');
    const orderFields = fields.filter(f => f.level === 'order');
    return { customerFields, orderFields };
  }, [fields]);

  const handleFieldChange = (newField: string) => {
    if (newField === CONVERT_TO_GROUP) {
      onConvertToGroup();
      return;
    }
    if (newField.startsWith('$')) {
      onChange({ ...rule, field: newField, operator: '$eq', value: newField === '$stage_completed' ? '' : true });
    } else {
      const cf = fields.find(f => `${f.level}_fields.${f.name}` === newField);
      const ft = cf ? getFieldType(cf) : 'string';
      const ops = allowedOperators(ft);
      const op = ops.includes(rule.operator) ? rule.operator : '$eq';
      onChange({ ...rule, field: newField, operator: op, value: '' });
    }
  };

  const handleOperatorChange = (op: string) => {
    const val = op === '$exists' ? true : rule.value;
    onChange({ ...rule, operator: op, value: val });
  };

  const handleValueChange = (val: unknown) => {
    onChange({ ...rule, value: val });
  };

  const fieldIcon = isStageCompleted ? (
    <GitBranch size={12} className="text-violet-500" strokeWidth={2} />
  ) : isPrevStage ? (
    <CheckSquare size={12} className="text-emerald-600" strokeWidth={2} />
  ) : null;

  const renderValueInput = () => {
    if (isAny || isPrevStage) return null;

    if (isStageCompleted) {
      return (
        <div>
          <div className={labelUi}>Стадия</div>
          <select
            value={String(rule.value ?? '')}
            onChange={e => handleValueChange(Number(e.target.value) || e.target.value)}
            className={inputBase}
          >
            <option value="">Выберите стадию…</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      );
    }

    if (isExistsOp) {
      return (
        <div>
          <div className={labelUi}>Статус</div>
          <select
            value={rule.value === true || rule.value === 'true' ? 'true' : 'false'}
            onChange={e => handleValueChange(e.target.value === 'true')}
            className={inputBase}
          >
            <option value="true">заполнено</option>
            <option value="false">не заполнено</option>
          </select>
        </div>
      );
    }

    if (fieldType === 'boolean') {
      return (
        <div>
          <div className={labelUi}>Значение</div>
          <select
            value={String(rule.value ?? '')}
            onChange={e => handleValueChange(e.target.value === 'true')}
            className={inputBase}
          >
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </div>
      );
    }

    if (fieldType === 'enum' && companyField?.options) {
      return (
        <div>
          <div className={labelUi}>Значение</div>
          <select
            value={String(rule.value ?? '')}
            onChange={e => handleValueChange(e.target.value)}
            className={inputBase}
          >
            <option value="">Выберите…</option>
            {companyField.options.map(o => (
              <option key={o.id} value={o.value}>{o.value}</option>
            ))}
          </select>
        </div>
      );
    }

    if (fieldType === 'number') {
      return (
        <div>
          <div className={labelUi}>Значение</div>
          <input
            type="number"
            value={rule.value === null || rule.value === undefined ? '' : String(rule.value)}
            onChange={e => {
              const v = e.target.value;
              handleValueChange(v === '' ? '' : Number(v));
            }}
            placeholder="0"
            className={inputBase}
          />
        </div>
      );
    }

    return (
      <div>
        <div className={labelUi}>Значение</div>
        <input
          type="text"
          value={String(rule.value ?? '')}
          onChange={e => handleValueChange(e.target.value)}
          placeholder="Введите значение…"
          className={inputBase}
        />
      </div>
    );
  };

  return (
    <div className="group relative bg-white rounded-xl ring-1 ring-black/[0.06] p-2.5 shadow-sm hover:ring-black/[0.08] transition-shadow">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 p-1.5 text-neutral-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end pr-6">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {fieldIcon}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Поле
            </span>
          </div>
          <select
            value={rule.field}
            onChange={e => handleFieldChange(e.target.value)}
            className={inputBase}
          >
            <option value="">Выберите поле…</option>
            {canNest && (
              <optgroup label="Структура">
                <option value={CONVERT_TO_GROUP}>↳ Вложенная группа условий</option>
              </optgroup>
            )}
            <optgroup label="Специальные">
              {SPECIAL_FIELDS.map(sf => (
                <option key={sf.value} value={sf.value}>{sf.label}</option>
              ))}
            </optgroup>
            {fieldOptions.orderFields.length > 0 && (
              <optgroup label="Поля заказа">
                {fieldOptions.orderFields.map(f => (
                  <option key={f.id} value={`order_fields.${f.name}`}>
                    {f.display_name || f.name}
                  </option>
                ))}
              </optgroup>
            )}
            {fieldOptions.customerFields.length > 0 && (
              <optgroup label="Поля клиента">
                {fieldOptions.customerFields.map(f => (
                  <option key={f.id} value={`customer_fields.${f.name}`}>
                    {f.display_name || f.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {!isSpecial && rule.field && (
          <div className="w-[100px]">
            <div className={labelUi}>Оператор</div>
            <select
              value={rule.operator}
              onChange={e => handleOperatorChange(e.target.value)}
              className={inputBase}
            >
              {FIELD_OPERATORS.filter(op => (operators as readonly string[]).includes(op.value)).map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {rule.field && <div className="mt-1.5">{renderValueInput()}</div>}
    </div>
  );
};
