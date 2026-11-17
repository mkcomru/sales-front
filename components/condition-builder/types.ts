export type RuleId = string;

export interface BuilderRule {
  id: RuleId;
  type: 'rule';
  field: string; // "order_fields.budget" | "$stage_completed" | "$prev_stage_completed" | "$any"
  operator: string; // "$eq" | "$gte" | "$exists" | ...
  value: unknown;
}

export interface BuilderGroup {
  id: RuleId;
  type: 'group';
  logic: 'and' | 'or';
  children: BuilderNode[];
}

export type BuilderNode = BuilderRule | BuilderGroup;

export const MAX_NESTING_DEPTH = 3;

export const FIELD_OPERATORS = [
  { value: '$eq', label: '=' },
  { value: '$ne', label: '≠' },
  { value: '$gt', label: '>' },
  { value: '$gte', label: '≥' },
  { value: '$lt', label: '<' },
  { value: '$lte', label: '≤' },
  { value: '$exists', label: 'существует' },
] as const;

export const NUMERIC_OPERATORS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$exists'] as const;
export const STRING_OPERATORS = ['$eq', '$ne', '$exists'] as const;
export const BOOLEAN_OPERATORS = ['$eq', '$ne', '$exists'] as const;
export const ENUM_OPERATORS = ['$eq', '$ne', '$exists'] as const;

export const SPECIAL_FIELDS = [
  { value: '$stage_completed', label: 'Пройдена стадия' },
  { value: '$prev_stage_completed', label: 'Пройдена предыдущая стадия' },
] as const;

export function createId(): RuleId {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createEmptyRule(): BuilderRule {
  return { id: createId(), type: 'rule', field: '', operator: '$eq', value: '' };
}

export function createEmptyGroup(logic: 'and' | 'or' = 'and'): BuilderGroup {
  return { id: createId(), type: 'group', logic, children: [createEmptyRule()] };
}
