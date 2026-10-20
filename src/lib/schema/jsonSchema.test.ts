import { describe, expect, it } from 'vitest';
import { fromJsonSchema, parseExportedJson, SchemaImportError, toJsonSchema } from './jsonSchema';
import { EXAMPLE_FORM } from '@/app/example';
import { findByKey, flatten } from '../tree';
import { isSection } from '../types';

describe('toJsonSchema', () => {
  const { schema, uiSchema } = toJsonSchema(EXAMPLE_FORM);

  it('produces a draft-07 object schema with required list and ordering', () => {
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.type).toBe('object');
    expect(schema.title).toBe('Merchant onboarding');
    expect(schema.required).toEqual(expect.arrayContaining(['businessName', 'phone', 'businessType', 'acceptTerms']));
    expect(schema.required).not.toContain('email');
    expect(uiSchema['ui:order']?.[0]).toBe('businessName');
  });

  it('maps field types to JSON Schema types, formats and constraints', () => {
    expect(schema.properties.businessName).toMatchObject({ type: 'string', minLength: 3, maxLength: 80 });
    expect(schema.properties.phone).toMatchObject({ type: 'string', pattern: '^01[3-9]\\d{8}$' });
    expect(schema.properties.email).toMatchObject({ type: 'string', format: 'email' });
    expect(schema.properties.launchDate).toMatchObject({ type: 'string', format: 'date' });
    expect(schema.properties.acceptTerms).toMatchObject({ type: 'boolean', default: false });
    expect(schema.properties.businessType).toMatchObject({ type: 'string', enum: ['grocery', 'pharmacy', 'restaurant', 'other'] });
    expect(schema.properties.categories).toMatchObject({ type: 'array', uniqueItems: true, items: { type: 'string', enum: ['food', 'fashion', 'electronics', 'home'] }, minItems: 1, maxItems: 3 });
  });

  it('nests sections as objects with their own required lists', () => {
    const address = schema.properties.address;
    expect(address?.type).toBe('object');
    expect(address?.properties?.postcode).toMatchObject({ type: 'number', minimum: 1000, maximum: 9999 });
    expect(address?.required).toEqual(['division', 'street']);
    expect(address?.additionalProperties).toBe(false);
  });

  it('puts widgets, placeholders, help and conditions in the UI schema', () => {
    expect(uiSchema.phone).toMatchObject({ 'ui:placeholder': '01712345678', 'ui:help': 'Bangladeshi mobile number, 11 digits.', 'ui:patternMessage': expect.any(String) });
    expect(uiSchema.businessTypeOther).toMatchObject({ 'ui:condition': { fieldKey: 'businessType', operator: 'equals', value: 'other' } });
    expect(uiSchema.categories).toMatchObject({ 'ui:widget': 'checkboxes' });
    expect((uiSchema.address as Record<string, unknown>)['ui:order']).toEqual(['division', 'street', 'postcode']);
    expect((uiSchema.address as Record<string, Record<string, unknown>>).division?.['ui:widget']).toBe('radio');
  });
});

describe('fromJsonSchema', () => {
  it('round-trips the example form through export and import', () => {
    const exported = toJsonSchema(EXAMPLE_FORM);
    const imported = fromJsonSchema(exported.schema, exported.uiSchema);
    const strip = (nodes: typeof EXAMPLE_FORM.nodes): unknown[] =>
      nodes.map((n) => {
        const { id: _id, ...rest } = n;
        return isSection(n) ? { ...rest, children: strip(n.children) } : rest;
      });
    expect(strip(imported.nodes)).toEqual(strip(EXAMPLE_FORM.nodes));
    expect(imported.title).toBe(EXAMPLE_FORM.title);
    expect(imported.id).toBe('merchant-onboarding');
    // A second round trip must be stable.
    expect(toJsonSchema(imported)).toEqual(exported);
  });

  it('imports a plain third-party schema without a UI schema', () => {
    const definition = fromJsonSchema({
      type: 'object',
      title: 'Contact',
      required: ['name'],
      properties: {
        name: { type: 'string', title: 'Full name', minLength: 2 },
        age: { type: 'integer', minimum: 18 },
        role: { type: 'string', enum: ['admin', 'user'] },
        tags: { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
        meta: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
    });
    const keys = flatten(definition.nodes).map((n) => `${n.type}:${n.key}`);
    expect(keys).toEqual(['text:name', 'number:age', 'select:role', 'multiselect:tags', 'section:meta', 'checkbox:ok']);
    expect(findByKey(definition.nodes, 'name')).toMatchObject({ required: true, validation: { minLength: 2 } });
    expect(findByKey(definition.nodes, 'role')).toMatchObject({ options: [{ label: 'admin', value: 'admin' }, { label: 'user', value: 'user' }] });
  });

  it('rejects invalid input with a helpful error', () => {
    expect(() => fromJsonSchema(null)).toThrow(SchemaImportError);
    expect(() => fromJsonSchema({ type: 'array' })).toThrow(/type "object"/);
    expect(() => parseExportedJson('{not json')).toThrow(/Invalid JSON/);
    const def = parseExportedJson(JSON.stringify(toJsonSchema(EXAMPLE_FORM)));
    expect(def.nodes).toHaveLength(EXAMPLE_FORM.nodes.length);
  });
});
