/**
 * JSON Schema draft-07 + UI Schema export/import.
 *
 * Mapping rules:
 * - text/email/textarea/date -> string (email gets format "email", date gets format "date")
 * - number -> number
 * - checkbox -> boolean
 * - select/radio -> string with enum (+ "enumNames" style labels in x-options)
 * - multiselect -> array of enum strings, uniqueItems
 * - section -> nested object with its own properties/required
 *
 * Everything that is presentation (widget, placeholder, help, conditions,
 * ordering) goes to the UI schema, following react-jsonschema-form naming so
 * the output is familiar to anyone who has used that ecosystem.
 */
import { createId, normalizeKey, uniqueKey } from '../ids';
import type { ConditionRule, FieldNode, FieldType, FormDefinition, FormNode, Option, SectionNode } from '../types';
import { CONDITION_OPERATORS, FIELD_TYPES, isSection } from '../types';

export interface JsonSchemaProperty {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer';
  title?: string;
  description?: string;
  format?: string;
  enum?: string[];
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: JsonSchemaProperty;
  uniqueItems?: boolean;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  /** Vendor extension carrying option labels (draft-07 has no enumNames). */
  'x-options'?: Option[];
}

export interface JsonSchema extends JsonSchemaProperty {
  $schema: 'http://json-schema.org/draft-07/schema#';
  $id?: string;
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
}

export interface UiSchemaField {
  'ui:widget'?: string;
  'ui:placeholder'?: string;
  'ui:help'?: string;
  'ui:condition'?: ConditionRule;
  'ui:patternMessage'?: string;
  'ui:order'?: string[];
  [key: string]: unknown;
}

export type UiSchema = Record<string, UiSchemaField | string[] | undefined> & { 'ui:order'?: string[] };

export interface ExportedForm {
  schema: JsonSchema;
  uiSchema: UiSchema;
}

const WIDGETS: Partial<Record<FieldType, string>> = {
  textarea: 'textarea',
  radio: 'radio',
  select: 'select',
  multiselect: 'checkboxes',
  checkbox: 'checkbox',
  date: 'date',
  email: 'email',
};

function fieldToProperty(field: FieldNode): JsonSchemaProperty {
  const prop: JsonSchemaProperty = { title: field.label };
  if (field.helpText) prop.description = field.helpText;
  const v = field.validation;
  switch (field.type) {
    case 'text':
    case 'textarea':
      prop.type = 'string';
      if (v.minLength !== undefined) prop.minLength = v.minLength;
      if (v.maxLength !== undefined) prop.maxLength = v.maxLength;
      if (v.pattern) prop.pattern = v.pattern;
      break;
    case 'email':
      prop.type = 'string';
      prop.format = 'email';
      if (v.maxLength !== undefined) prop.maxLength = v.maxLength;
      break;
    case 'date':
      prop.type = 'string';
      prop.format = 'date';
      break;
    case 'number':
      prop.type = 'number';
      if (v.min !== undefined) prop.minimum = v.min;
      if (v.max !== undefined) prop.maximum = v.max;
      break;
    case 'checkbox':
      prop.type = 'boolean';
      break;
    case 'select':
    case 'radio':
      prop.type = 'string';
      prop.enum = field.options.map((o) => o.value);
      prop['x-options'] = field.options.map((o) => ({ ...o }));
      break;
    case 'multiselect':
      prop.type = 'array';
      prop.uniqueItems = true;
      prop.items = { type: 'string', enum: field.options.map((o) => o.value) };
      prop['x-options'] = field.options.map((o) => ({ ...o }));
      if (v.minLength !== undefined) (prop as Record<string, unknown>).minItems = v.minLength;
      if (v.maxLength !== undefined) (prop as Record<string, unknown>).maxItems = v.maxLength;
      break;
  }
  if (field.defaultValue !== undefined && field.defaultValue !== '' && !(Array.isArray(field.defaultValue) && field.defaultValue.length === 0)) {
    prop.default = field.defaultValue;
  }
  return prop;
}

function fieldToUi(field: FieldNode): UiSchemaField | undefined {
  const ui: UiSchemaField = {};
  const widget = WIDGETS[field.type];
  if (widget) ui['ui:widget'] = widget;
  if (field.placeholder) ui['ui:placeholder'] = field.placeholder;
  if (field.helpText) ui['ui:help'] = field.helpText;
  if (field.visibleWhen) ui['ui:condition'] = { ...field.visibleWhen };
  if (field.validation.patternMessage) ui['ui:patternMessage'] = field.validation.patternMessage;
  return Object.keys(ui).length ? ui : undefined;
}

function nodesToSchema(nodes: readonly FormNode[]): { properties: Record<string, JsonSchemaProperty>; required: string[]; ui: UiSchema } {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];
  const ui: UiSchema = { 'ui:order': nodes.map((n) => n.key) };

  for (const node of nodes) {
    if (isSection(node)) {
      const inner = nodesToSchema(node.children);
      const sectionProp: JsonSchemaProperty = { type: 'object', title: node.label, properties: inner.properties, additionalProperties: false };
      if (node.description) sectionProp.description = node.description;
      if (inner.required.length) sectionProp.required = inner.required;
      properties[node.key] = sectionProp;
      const sectionUi: UiSchemaField = { ...inner.ui };
      if (node.visibleWhen) sectionUi['ui:condition'] = { ...node.visibleWhen };
      ui[node.key] = sectionUi;
    } else {
      properties[node.key] = fieldToProperty(node);
      if (node.required) required.push(node.key);
      const fieldUi = fieldToUi(node);
      if (fieldUi) ui[node.key] = fieldUi;
    }
  }
  return { properties, required, ui };
}

/** Export a form definition as JSON Schema draft-07 plus a UI schema. */
export function toJsonSchema(definition: FormDefinition): ExportedForm {
  const { properties, required, ui } = nodesToSchema(definition.nodes);
  const schema: JsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `urn:form:${definition.id}`,
    title: definition.title,
    type: 'object',
    properties,
    additionalProperties: false,
  };
  if (definition.description) schema.description = definition.description;
  if (required.length) schema.required = required;
  return { schema, uiSchema: ui };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export class SchemaImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaImportError';
  }
}

function inferType(prop: JsonSchemaProperty, ui: UiSchemaField | undefined): FieldType | 'section' {
  const widget = ui?.['ui:widget'];
  if (prop.type === 'object') return 'section';
  if (prop.type === 'boolean') return 'checkbox';
  if (prop.type === 'number' || prop.type === 'integer') return 'number';
  if (prop.type === 'array') return 'multiselect';
  if (prop.enum) return widget === 'radio' ? 'radio' : 'select';
  if (prop.format === 'email' || widget === 'email') return 'email';
  if (prop.format === 'date' || widget === 'date') return 'date';
  if (widget === 'textarea') return 'textarea';
  return 'text';
}

function optionsFrom(prop: JsonSchemaProperty): Option[] {
  const explicit = prop['x-options'];
  if (Array.isArray(explicit) && explicit.length) return explicit.map((o) => ({ label: String(o.label), value: String(o.value) }));
  const values = prop.enum ?? prop.items?.enum ?? [];
  return values.map((v) => ({ label: String(v), value: String(v) }));
}

function conditionFrom(ui: UiSchemaField | undefined): ConditionRule | undefined {
  const raw = ui?.['ui:condition'];
  if (!raw || typeof raw !== 'object') return undefined;
  const rule = raw as Partial<ConditionRule>;
  if (typeof rule.fieldKey !== 'string' || !rule.operator || !(CONDITION_OPERATORS as readonly string[]).includes(rule.operator)) return undefined;
  const result: ConditionRule = { fieldKey: rule.fieldKey, operator: rule.operator };
  if (rule.value !== undefined) result.value = rule.value;
  return result;
}

function orderedKeys(properties: Record<string, JsonSchemaProperty>, ui: UiSchema | UiSchemaField | undefined): string[] {
  const keys = Object.keys(properties);
  const order = ui?.['ui:order'];
  if (!Array.isArray(order)) return keys;
  const ordered = order.filter((k): k is string => typeof k === 'string' && k in properties);
  return [...ordered, ...keys.filter((k) => !ordered.includes(k))];
}

function propertiesToNodes(
  properties: Record<string, JsonSchemaProperty>,
  required: readonly string[],
  ui: UiSchema | UiSchemaField | undefined,
  taken: Set<string>,
): FormNode[] {
  return orderedKeys(properties, ui).map((rawKey) => {
    const prop = properties[rawKey] as JsonSchemaProperty;
    const fieldUi = (ui?.[rawKey] ?? undefined) as UiSchemaField | undefined;
    const key = uniqueKey(normalizeKey(rawKey) || 'field', taken);
    taken.add(key);
    const type = inferType(prop, fieldUi);
    const condition = conditionFrom(fieldUi);

    if (type === 'section') {
      const section: SectionNode = {
        id: createId(),
        type: 'section',
        key,
        label: prop.title ?? rawKey,
        children: propertiesToNodes(prop.properties ?? {}, prop.required ?? [], fieldUi, taken),
      };
      if (prop.description) section.description = prop.description;
      if (condition) section.visibleWhen = condition;
      return section;
    }

    const field: FieldNode = {
      id: createId(),
      type,
      key,
      label: prop.title ?? rawKey,
      required: required.includes(rawKey),
      validation: {},
      options: FIELD_TYPES.includes(type) && (prop.enum || prop.items?.enum) ? optionsFrom(prop) : [],
    };
    if (prop.minLength !== undefined) field.validation.minLength = prop.minLength;
    if (prop.maxLength !== undefined) field.validation.maxLength = prop.maxLength;
    const extra = prop as Record<string, unknown>;
    if (typeof extra.minItems === 'number') field.validation.minLength = extra.minItems;
    if (typeof extra.maxItems === 'number') field.validation.maxLength = extra.maxItems;
    if (prop.minimum !== undefined) field.validation.min = prop.minimum;
    if (prop.maximum !== undefined) field.validation.max = prop.maximum;
    if (prop.pattern) field.validation.pattern = prop.pattern;
    if (typeof fieldUi?.['ui:patternMessage'] === 'string') field.validation.patternMessage = fieldUi['ui:patternMessage'];
    if (typeof fieldUi?.['ui:placeholder'] === 'string') field.placeholder = fieldUi['ui:placeholder'];
    const help = typeof fieldUi?.['ui:help'] === 'string' ? fieldUi['ui:help'] : prop.description;
    if (help) field.helpText = help;
    if (prop.default !== undefined) field.defaultValue = prop.default as FieldNode['defaultValue'];
    if (condition) field.visibleWhen = condition;
    return field;
  });
}

/**
 * Parse a JSON Schema (+ optional UI schema) back into a form definition.
 * Unknown constructs are ignored rather than rejected so real-world schemas
 * still import; only a non-object root is an error.
 */
export function fromJsonSchema(schema: unknown, uiSchema: unknown = {}): FormDefinition {
  if (!schema || typeof schema !== 'object') throw new SchemaImportError('Schema must be a JSON object');
  const root = schema as JsonSchemaProperty & { $id?: string };
  if (root.type !== 'object' || !root.properties || typeof root.properties !== 'object') {
    throw new SchemaImportError('Root schema must have type "object" and a "properties" map');
  }
  const ui = (uiSchema && typeof uiSchema === 'object' ? uiSchema : {}) as UiSchema;
  const taken = new Set<string>();
  const definition: FormDefinition = {
    version: 1,
    id: typeof root.$id === 'string' && root.$id.startsWith('urn:form:') ? root.$id.slice('urn:form:'.length) : createId('form'),
    title: root.title ?? 'Imported form',
    nodes: propertiesToNodes(root.properties, root.required ?? [], ui, taken),
  };
  if (root.description) definition.description = root.description;
  return definition;
}

/** Parse the combined `{ schema, uiSchema }` document or a bare schema. */
export function parseExportedJson(text: string): FormDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SchemaImportError('Invalid JSON');
  }
  if (parsed && typeof parsed === 'object' && 'schema' in parsed) {
    const doc = parsed as { schema: unknown; uiSchema?: unknown };
    return fromJsonSchema(doc.schema, doc.uiSchema);
  }
  return fromJsonSchema(parsed);
}
