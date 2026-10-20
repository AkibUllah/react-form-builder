import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import type { FieldNode, FormDefinition, FormNode } from '../types';
import { isSection } from '../types';
import { computeVisibility } from '../rules/conditions';

/**
 * Build a zod schema from a form definition.
 *
 * Per-field constraints (format, length, range, pattern, enum) are regular zod
 * rules. "Required" is enforced in a `superRefine` pass that first computes
 * which fields are visible for the submitted data, so a required field hidden
 * by a condition never blocks submission.
 */
export function buildZodSchema(definition: FormDefinition) {
  const shape = nodesToShape(definition.nodes);
  return z.object(shape).superRefine((data, ctx) => {
    const visibility = computeVisibility(definition, data);
    checkRequired(definition.nodes, data as Record<string, unknown>, [], visibility, ctx);
  });
}

export type FormSchema = ReturnType<typeof buildZodSchema>;

function nodesToShape(nodes: readonly FormNode[]): Record<string, ZodTypeAny> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const node of nodes) {
    shape[node.key] = isSection(node) ? z.object(nodesToShape(node.children)).optional().default({}) : fieldToZod(node);
  }
  return shape;
}

function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null) return undefined;
  return value;
}

export function fieldToZod(field: FieldNode): ZodTypeAny {
  const v = field.validation;
  let schema: ZodTypeAny;
  switch (field.type) {
    case 'text':
    case 'textarea': {
      let s = z.string().trim();
      if (v.minLength !== undefined) s = s.min(v.minLength, `Must be at least ${v.minLength} characters`);
      if (v.maxLength !== undefined) s = s.max(v.maxLength, `Must be at most ${v.maxLength} characters`);
      if (v.pattern) s = s.regex(safeRegex(v.pattern), v.patternMessage ?? 'Invalid format');
      schema = s;
      break;
    }
    case 'email': {
      let s = z.string().trim().email('Enter a valid email address');
      if (v.maxLength !== undefined) s = s.max(v.maxLength, `Must be at most ${v.maxLength} characters`);
      schema = s;
      break;
    }
    case 'date':
      schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date as YYYY-MM-DD').refine((s) => !Number.isNaN(new Date(s).getTime()), 'Enter a valid date');
      break;
    case 'number': {
      let s = z.coerce.number({ invalid_type_error: 'Enter a number' });
      if (v.min !== undefined) s = s.min(v.min, `Must be at least ${v.min}`);
      if (v.max !== undefined) s = s.max(v.max, `Must be at most ${v.max}`);
      schema = s;
      break;
    }
    case 'checkbox':
      schema = z.coerce.boolean();
      break;
    case 'select':
    case 'radio': {
      const values = field.options.map((o) => o.value);
      schema = values.length ? z.enum(values as [string, ...string[]], { errorMap: () => ({ message: 'Choose one of the options' }) }) : z.string();
      break;
    }
    case 'multiselect': {
      const values = field.options.map((o) => o.value);
      let s = z.array(values.length ? z.enum(values as [string, ...string[]]) : z.string());
      if (v.minLength !== undefined) s = s.min(v.minLength, `Choose at least ${v.minLength}`);
      if (v.maxLength !== undefined) s = s.max(v.maxLength, `Choose at most ${v.maxLength}`);
      schema = s.default([]);
      break;
    }
  }
  // Every field is optional at the type level; "required" is handled in superRefine.
  return z.preprocess(emptyToUndefined, schema.optional());
}

function safeRegex(source: string): RegExp {
  try {
    return new RegExp(source);
  } catch {
    return /[\s\S]*/;
  }
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'boolean') return value === false;
  return false;
}

function checkRequired(nodes: readonly FormNode[], data: Record<string, unknown>, path: string[], visibility: Map<string, boolean>, ctx: z.RefinementCtx): void {
  for (const node of nodes) {
    if (visibility.get(node.id) === false) continue;
    if (isSection(node)) {
      checkRequired(node.children, (data?.[node.key] ?? {}) as Record<string, unknown>, [...path, node.key], visibility, ctx);
      continue;
    }
    if (node.required && isBlank(data?.[node.key])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, node.key],
        message: node.type === 'checkbox' ? 'This must be checked' : node.type === 'multiselect' ? 'Choose at least one option' : 'This field is required',
      });
    }
  }
}

/** Default values for react-hook-form derived from the definition. */
export function defaultValues(nodes: readonly FormNode[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const node of nodes) {
    if (isSection(node)) {
      out[node.key] = defaultValues(node.children);
    } else if (node.defaultValue !== undefined) {
      out[node.key] = node.defaultValue;
    } else if (node.type === 'checkbox') {
      out[node.key] = false;
    } else if (node.type === 'multiselect') {
      out[node.key] = [];
    } else {
      out[node.key] = '';
    }
  }
  return out;
}

/** Remove values for hidden fields so submitted data never contains stale answers. */
export function stripHidden(definition: FormDefinition, data: Record<string, unknown>): Record<string, unknown> {
  const visibility = computeVisibility(definition, data);
  const strip = (nodes: readonly FormNode[], record: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const node of nodes) {
      if (visibility.get(node.id) === false) continue;
      if (isSection(node)) out[node.key] = strip(node.children, (record[node.key] ?? {}) as Record<string, unknown>);
      else if (record[node.key] !== undefined) out[node.key] = record[node.key];
    }
    return out;
  };
  return strip(definition.nodes, data);
}
