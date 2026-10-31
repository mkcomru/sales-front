import type { BuilderGroup, BuilderNode, BuilderRule } from './types';
import { createId } from './types';

// ── JSON → Builder Tree ─────────────────────────────────────────────

const LOGICAL_OPS = new Set(['$and', '$or']);
const CUSTOM_OPS = new Set(['$stage_completed', '$prev_stage_completed', '$any']);
const FIELD_OPS = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$exists']);

/**
 * Parse a transition_condition JSON into a BuilderGroup tree.
 * Returns null when JSON contains constructs the builder cannot represent
 * (e.g. $not, deeply nested structures beyond MAX_DEPTH=3).
 */
export function jsonToBuilderTree(
  json: Record<string, unknown> | null | undefined,
): BuilderGroup | null {
  if (!json || typeof json !== 'object') return null;
  if (Object.keys(json).length === 0) return emptyRoot();
  try {
    return parseDict(json, 1);
  } catch {
    return null;
  }
}

function emptyRoot(): BuilderGroup {
  return { id: createId(), type: 'group', logic: 'and', children: [] };
}

function parseDict(obj: Record<string, unknown>, depth: number): BuilderGroup {
  if (depth > 3) throw new Error('nesting too deep');

  const children: BuilderNode[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (key === '$and' || key === '$or') {
      if (!Array.isArray(value)) throw new Error(`${key} must be array`);
      const group: BuilderGroup = {
        id: createId(),
        type: 'group',
        logic: key === '$and' ? 'and' : 'or',
        children: value.map(item => parseOperand(item, depth + 1)),
      };
      children.push(group);
    } else if (key === '$not') {
      // $not not representable in builder
      throw new Error('$not unsupported');
    } else if (CUSTOM_OPS.has(key)) {
      children.push(customOpToRule(key, value));
    } else if (!key.startsWith('$')) {
      children.push(...fieldToRules(key, value));
    } else {
      throw new Error(`unknown operator ${key}`);
    }
  }

  return { id: createId(), type: 'group', logic: 'and', children };
}

function parseOperand(item: unknown, depth: number): BuilderNode {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new Error('operand must be object');
  }
  const obj = item as Record<string, unknown>;
  const keys = Object.keys(obj);

  // Single custom op
  if (keys.length === 1 && CUSTOM_OPS.has(keys[0])) {
    return customOpToRule(keys[0], obj[keys[0]]);
  }

  // Single logical op → unwrap into group
  if (keys.length === 1 && LOGICAL_OPS.has(keys[0])) {
    const op = keys[0];
    const val = obj[op];
    if (!Array.isArray(val)) throw new Error(`${op} must be array`);
    return {
      id: createId(),
      type: 'group',
      logic: op === '$and' ? 'and' : 'or',
      children: val.map(v => parseOperand(v, depth + 1)),
    };
  }

  // Single field condition
  if (keys.length === 1 && !keys[0].startsWith('$')) {
    const rules = fieldToRules(keys[0], obj[keys[0]]);
    if (rules.length === 1) return rules[0];
    return { id: createId(), type: 'group', logic: 'and', children: rules };
  }

  // Multiple keys → implicit AND dict → parse as full dict
  return parseDict(obj, depth);
}

function customOpToRule(key: string, value: unknown): BuilderRule {
  if (key === '$any') {
    return { id: createId(), type: 'rule', field: '$any', operator: '$eq', value: true };
  }
  if (key === '$prev_stage_completed') {
    return { id: createId(), type: 'rule', field: '$prev_stage_completed', operator: '$eq', value: true };
  }
  // $stage_completed
  return { id: createId(), type: 'rule', field: '$stage_completed', operator: '$eq', value };
}

function fieldToRules(fieldPath: string, value: unknown): BuilderRule[] {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    // Simple equality
    return [{ id: createId(), type: 'rule', field: fieldPath, operator: '$eq', value }];
  }

  const obj = value as Record<string, unknown>;
  const rules: BuilderRule[] = [];
  for (const [op, opVal] of Object.entries(obj)) {
    if (!FIELD_OPS.has(op)) throw new Error(`unknown field op ${op}`);
    rules.push({ id: createId(), type: 'rule', field: fieldPath, operator: op, value: opVal });
  }
  return rules;
}

// ── Builder Tree → JSON ─────────────────────────────────────────────

export function builderTreeToJson(root: BuilderGroup): Record<string, unknown> {
  // Filter out incomplete rules
  const validChildren = root.children.filter(c => isNodeValid(c));
  if (validChildren.length === 0) return {};

  // Root-level AND: try flat format for backward compatibility
  if (root.logic === 'and') {
    return tryFlatAndFormat(validChildren) ?? { $and: validChildren.map(nodeToJson) };
  }

  // OR root
  return { $or: validChildren.map(nodeToJson) };
}

function tryFlatAndFormat(children: BuilderNode[]): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const child of children) {
    if (child.type === 'group') {
      const key = child.logic === 'or' ? '$or' : '$and';
      if (usedKeys.has(key)) return null;
      usedKeys.add(key);
      result[key] = child.children.filter(isNodeValid).map(nodeToJson);
    } else {
      const json = ruleToJsonEntry(child);
      if (!json) continue;
      const [key] = Object.keys(json);
      if (usedKeys.has(key)) return null;
      usedKeys.add(key);
      Object.assign(result, json);
    }
  }

  return result;
}

function nodeToJson(node: BuilderNode): Record<string, unknown> {
  if (node.type === 'group') return groupToJson(node);
  return ruleToJsonEntry(node) ?? {};
}

function groupToJson(group: BuilderGroup): Record<string, unknown> {
  const validChildren = group.children.filter(isNodeValid);
  if (group.logic === 'and') {
    return tryFlatAndFormat(validChildren) ?? { $and: validChildren.map(nodeToJson) };
  }
  return { $or: validChildren.map(nodeToJson) };
}

function ruleToJsonEntry(rule: BuilderRule): Record<string, unknown> | null {
  if (!rule.field) return null;

  if (rule.field === '$any') return { $any: true };
  if (rule.field === '$prev_stage_completed') return { $prev_stage_completed: true };
  if (rule.field === '$stage_completed') return { $stage_completed: rule.value };

  // Regular field
  if (rule.operator === '$eq') return { [rule.field]: rule.value };
  return { [rule.field]: { [rule.operator]: rule.value } };
}

function isNodeValid(node: BuilderNode): boolean {
  if (node.type === 'group') return node.children.some(isNodeValid);
  if (!node.field) return false;
  if (node.field === '$any' || node.field === '$prev_stage_completed') return true;
  if (node.field === '$stage_completed') return node.value !== '' && node.value !== undefined;
  return true;
}
