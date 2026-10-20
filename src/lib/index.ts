/**
 * Public surface of the form-builder library. Everything the app imports from
 * `@/lib` goes through here so the folder can be extracted to a package.
 */
export * from './types';
export { createId, slugifyKey, uniqueKey, normalizeKey } from './ids';
export * from './tree';
export { evaluateCondition, computeVisibility, flattenValues } from './rules/conditions';
export type { FormValues } from './rules/conditions';
export { builderReducer, createNode, createEmptyDefinition, initialBuilderState, indexWithin } from './store/reducer';
export type { BuilderAction, BuilderState } from './store/reducer';
export { createBuilderStore, useBuilderStore, STORAGE_KEY } from './store/useBuilderStore';
export type { BuilderStore } from './store/useBuilderStore';
export { toJsonSchema, fromJsonSchema, parseExportedJson, SchemaImportError } from './schema/jsonSchema';
export type { ExportedForm, JsonSchema, JsonSchemaProperty, UiSchema, UiSchemaField } from './schema/jsonSchema';
export { buildZodSchema, fieldToZod, defaultValues, stripHidden } from './schema/zod';
export type { FormSchema } from './schema/zod';
export { FormRenderer } from './renderer/FormRenderer';
export type { FormRendererProps } from './renderer/FormRenderer';
