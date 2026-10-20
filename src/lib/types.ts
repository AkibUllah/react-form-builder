/**
 * Internal form model. This is what the builder edits and what the renderer
 * consumes. JSON Schema + UI Schema are derived from it (and parsed back into
 * it) by `lib/schema`.
 */

export const FIELD_TYPES = ['text', 'email', 'number', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'textarea'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export type NodeType = FieldType | 'section';

export interface Option {
  label: string;
  value: string;
}

export const CONDITION_OPERATORS = ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty', 'greaterThan', 'lessThan'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/** Show this node only when the referenced field satisfies the rule. */
export interface ConditionRule {
  fieldKey: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface Validation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  /** ECMAScript regex source, without slashes. */
  pattern?: string;
  patternMessage?: string;
}

interface NodeBase {
  id: string;
  /** Property name in the submitted data and in JSON Schema. Unique per form. */
  key: string;
  label: string;
  visibleWhen?: ConditionRule | null;
}

export interface FieldNode extends NodeBase {
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation: Validation;
  options: Option[];
  defaultValue?: string | number | boolean | string[];
}

export interface SectionNode extends NodeBase {
  type: 'section';
  description?: string;
  children: FormNode[];
}

export type FormNode = FieldNode | SectionNode;

export interface FormDefinition {
  version: 1;
  id: string;
  title: string;
  description?: string;
  nodes: FormNode[];
}

export function isSection(node: FormNode): node is SectionNode {
  return node.type === 'section';
}

export function isField(node: FormNode): node is FieldNode {
  return node.type !== 'section';
}

/** Field types that carry an `options` list. */
export const CHOICE_TYPES: readonly FieldType[] = ['select', 'multiselect', 'radio'];

export function hasOptions(type: NodeType): type is 'select' | 'multiselect' | 'radio' {
  return (CHOICE_TYPES as readonly string[]).includes(type);
}

export const FIELD_TYPE_LABELS: Record<NodeType, string> = {
  text: 'Text',
  email: 'Email',
  number: 'Number',
  select: 'Dropdown',
  multiselect: 'Multi-select',
  checkbox: 'Checkbox',
  radio: 'Radio group',
  date: 'Date',
  textarea: 'Paragraph',
  section: 'Section',
};
