import type { ConditionRule, FormDefinition, FormNode } from '../types';
import { isSection } from '../types';

export type FormValues = Record<string, unknown>;

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'boolean') return value === false;
  return false;
}

function toComparable(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === undefined || value === null) return '';
  return String(value);
}

/** Evaluate one rule against a flat map of field key -> value. */
export function evaluateCondition(rule: ConditionRule, values: Readonly<FormValues>): boolean {
  const actual = values[rule.fieldKey];
  switch (rule.operator) {
    case 'isEmpty':
      return isEmptyValue(actual);
    case 'isNotEmpty':
      return !isEmptyValue(actual);
    case 'equals':
      if (Array.isArray(actual)) return actual.map(toComparable).includes(toComparable(rule.value));
      return toComparable(actual) === toComparable(rule.value);
    case 'notEquals':
      if (Array.isArray(actual)) return !actual.map(toComparable).includes(toComparable(rule.value));
      return toComparable(actual) !== toComparable(rule.value);
    case 'contains':
      if (Array.isArray(actual)) return actual.map(toComparable).includes(toComparable(rule.value));
      return toComparable(actual).toLowerCase().includes(toComparable(rule.value).toLowerCase());
    case 'greaterThan':
      return Number(actual) > Number(rule.value);
    case 'lessThan':
      return Number(actual) < Number(rule.value);
    default:
      return true;
  }
}

/**
 * Flatten nested form data (sections become nested objects) into key -> value
 * so rules can reference any field regardless of its section.
 */
export function flattenValues(nodes: readonly FormNode[], data: unknown, out: FormValues = {}): FormValues {
  const record = (data ?? {}) as Record<string, unknown>;
  for (const node of nodes) {
    if (isSection(node)) {
      flattenValues(node.children, record[node.key], out);
    } else {
      out[node.key] = record[node.key];
    }
  }
  return out;
}

/**
 * Compute visibility for every node. A node is hidden when its own rule fails
 * or when any ancestor is hidden. Hidden fields are treated as empty when
 * other rules reference them, which prevents stale values from toggling
 * fields that the user can no longer see.
 */
export function computeVisibility(definition: FormDefinition, data: unknown): Map<string, boolean> {
  const values = flattenValues(definition.nodes, data);
  const result = new Map<string, boolean>();

  const visit = (nodes: readonly FormNode[], parentVisible: boolean) => {
    for (const node of nodes) {
      const own = node.visibleWhen ? evaluateCondition(node.visibleWhen, values) : true;
      const visible = parentVisible && own;
      result.set(node.id, visible);
      if (!visible && !isSection(node)) values[node.key] = undefined;
      if (isSection(node)) visit(node.children, visible);
    }
  };
  // Two passes so rules referencing fields declared later still see hidden fields as empty.
  visit(definition.nodes, true);
  visit(definition.nodes, true);
  return result;
}
