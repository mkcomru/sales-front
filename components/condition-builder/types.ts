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
  return crypto.randomUUID();
}

export function createEmptyRule(): BuilderRule {
  return { id: createId(), type: 'rule', field: '', operator: '$eq', value: '' };
}

export function createEmptyGroup(logic: 'and' | 'or' = 'and'): BuilderGroup {
  return { id: createId(), type: 'group', logic, children: [createEmptyRule()] };
}
