import { useId } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { FieldError } from 'react-hook-form';
import type { FieldNode } from '../../types';
import { cn } from '../../cn';

interface FieldControlProps {
  field: FieldNode;
  /** Dot path in the form data, e.g. "address.city". */
  name: string;
}

const controlClass =
  'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100';

function getError(errors: Record<string, unknown>, name: string): FieldError | undefined {
  return name.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), errors) as FieldError | undefined;
}

/** Renders one field with label, control, help text and error message. */
export function FieldControl({ field, name }: FieldControlProps) {
  const id = useId();
  const { register, control, formState } = useFormContext();
  const error = getError(formState.errors as Record<string, unknown>, name);
  const describedBy = error ? `${id}-error` : field.helpText ? `${id}-help` : undefined;
  const border = error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700';
  const requiredMark = field.required ? <span className="ml-0.5 text-red-600" aria-hidden="true">*</span> : null;

  const control_ = (() => {
    switch (field.type) {
      case 'textarea':
        return <textarea id={id} rows={4} placeholder={field.placeholder} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(controlClass, border)} {...register(name)} />;
      case 'select':
        return (
          <select id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(controlClass, border)} {...register(name)}>
            <option value="">{field.placeholder || 'Select…'}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="space-y-2">
            {field.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100">
                <input type="radio" value={o.value} className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500" {...register(name)} />
                {o.label}
              </label>
            ))}
          </div>
        );
      case 'multiselect':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field: rhf }) => {
              const selected: string[] = Array.isArray(rhf.value) ? rhf.value : [];
              return (
                <div role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="space-y-2">
                  {field.options.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        value={o.value}
                        checked={selected.includes(o.value)}
                        onChange={(e) => rhf.onChange(e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
                        onBlur={rhf.onBlur}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              );
            }}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100">
            <input id={id} type="checkbox" aria-describedby={describedBy} aria-invalid={error ? true : undefined} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" {...register(name)} />
            {field.label}
            {requiredMark}
          </label>
        );
      case 'number':
        return <input id={id} type="number" step="any" placeholder={field.placeholder} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(controlClass, border)} {...register(name)} />;
      case 'date':
        return <input id={id} type="date" aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(controlClass, border)} {...register(name)} />;
      case 'email':
        return <input id={id} type="email" placeholder={field.placeholder} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(controlClass, border)} {...register(name)} />;
      default:
        return <input id={id} type="text" placeholder={field.placeholder} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(controlClass, border)} {...register(name)} />;
    }
  })();

  const usesOwnLabel = field.type === 'checkbox';
  const groupLabel = field.type === 'radio' || field.type === 'multiselect';

  return (
    <div className="space-y-1.5" data-field-key={field.key}>
      {!usesOwnLabel &&
        (groupLabel ? (
          <p id={`${id}-label`} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {field.label}
            {requiredMark}
          </p>
        ) : (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            {field.label}
            {requiredMark}
          </label>
        ))}
      {control_}
      {error?.message ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {String(error.message)}
        </p>
      ) : (
        field.helpText && (
          <p id={`${id}-help`} className="text-xs text-slate-500 dark:text-slate-400">
            {field.helpText}
          </p>
        )
      )}
    </div>
  );
}
