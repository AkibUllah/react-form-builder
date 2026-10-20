import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FormDefinition, FormNode } from '../types';
import { isSection } from '../types';
import { buildZodSchema, defaultValues, stripHidden } from '../schema/zod';
import { computeVisibility } from '../rules/conditions';
import { FieldControl } from './fields/FieldControl';
import { cn } from '../cn';

export interface FormRendererProps {
  definition: FormDefinition;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  /** Render inside a card with title/description. Default true. */
  showHeader?: boolean;
  className?: string;
  footer?: ReactNode;
}

function NodeList({ nodes, path, visibility }: { nodes: readonly FormNode[]; path: string[]; visibility: Map<string, boolean> }) {
  return (
    <>
      {nodes.map((node) => {
        if (visibility.get(node.id) === false) return null;
        const name = [...path, node.key].join('.');
        if (isSection(node)) {
          return (
            <fieldset key={node.id} className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{node.label}</legend>
              {node.description && <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{node.description}</p>}
              {node.children.length === 0 && <p className="text-xs italic text-slate-400">This section has no fields.</p>}
              <NodeList nodes={node.children} path={[...path, node.key]} visibility={visibility} />
            </fieldset>
          );
        }
        return <FieldControl key={node.id} field={node} name={name} />;
      })}
    </>
  );
}

/**
 * Render a working form from a definition. Validation is a zod schema
 * generated from the definition; conditional fields are hidden live and
 * excluded from both validation and the submitted payload.
 */
export function FormRenderer({ definition, onSubmit, submitLabel = 'Submit', showHeader = true, className, footer }: FormRendererProps) {
  const schema = useMemo(() => buildZodSchema(definition), [definition]);
  const defaults = useMemo(() => defaultValues(definition.nodes), [definition]);
  const methods = useForm<Record<string, unknown>>({ resolver: zodResolver(schema), defaultValues: defaults, mode: 'onTouched' });
  const [submitting, setSubmitting] = useState(false);

  const values = useWatch({ control: methods.control });
  const visibility = useMemo(() => computeVisibility(definition, values), [definition, values]);

  const handleSubmit = methods.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      await onSubmit(stripHidden(definition, data));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} noValidate className={cn('space-y-5', className)} aria-label={definition.title}>
        {showHeader && (
          <header>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{definition.title}</h2>
            {definition.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{definition.description}</p>}
          </header>
        )}
        {definition.nodes.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">This form has no fields yet.</p>
        ) : (
          <NodeList nodes={definition.nodes} path={[]} visibility={visibility} />
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          {footer}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
