import { Plus, Trash2 } from 'lucide-react';
import { CONDITION_OPERATORS, FIELD_TYPE_LABELS, findNode, flatten, hasOptions, isField, isSection, useBuilderStore } from '@/lib';
import type { ConditionOperator, ConditionRule, FieldNode, FormNode, Option, SectionNode, Validation } from '@/lib';
import { Button } from './Button';

const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'equals',
  notEquals: 'does not equal',
  contains: 'contains',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  greaterThan: 'is greater than',
  lessThan: 'is less than',
};

function ConditionEditor({ node, candidates }: { node: FormNode; candidates: FieldNode[] }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const rule = node.visibleWhen ?? null;
  const set = (next: ConditionRule | null) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { visibleWhen: next } });
  const needsValue = rule && rule.operator !== 'isEmpty' && rule.operator !== 'isNotEmpty';
  const target = rule ? candidates.find((c) => c.key === rule.fieldKey) : undefined;

  return (
    <fieldset className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Conditional visibility</legend>
      {!rule ? (
        <Button variant="ghost" className="h-8 w-full justify-start px-2 text-xs" disabled={candidates.length === 0} onClick={() => set({ fieldKey: candidates[0]?.key ?? '', operator: 'equals', value: '' })}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {candidates.length === 0 ? 'Add another field first' : 'Show only when…'}
        </Button>
      ) : (
        <>
          <Row label="Field">
            <select className={inputClass} value={rule.fieldKey} onChange={(e) => set({ ...rule, fieldKey: e.target.value })}>
              {candidates.map((c) => (
                <option key={c.id} value={c.key}>
                  {c.label} ({c.key})
                </option>
              ))}
            </select>
          </Row>
          <Row label="Operator">
            <select className={inputClass} value={rule.operator} onChange={(e) => set({ ...rule, operator: e.target.value as ConditionOperator })}>
              {CONDITION_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>
          </Row>
          {needsValue && (
            <Row label="Value">
              {target && hasOptions(target.type) ? (
                <select className={inputClass} value={String(rule.value ?? '')} onChange={(e) => set({ ...rule, value: e.target.value })}>
                  <option value="">—</option>
                  {target.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : target?.type === 'checkbox' ? (
                <select className={inputClass} value={String(rule.value ?? 'true')} onChange={(e) => set({ ...rule, value: e.target.value === 'true' })}>
                  <option value="true">checked</option>
                  <option value="false">unchecked</option>
                </select>
              ) : (
                <input className={inputClass} value={String(rule.value ?? '')} onChange={(e) => set({ ...rule, value: e.target.value })} />
              )}
            </Row>
          )}
          <Button variant="danger" className="h-8 px-2 text-xs" onClick={() => set(null)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove rule
          </Button>
        </>
      )}
    </fieldset>
  );
}

function OptionsEditor({ field }: { field: FieldNode }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const update = (options: Option[]) => dispatch({ type: 'UPDATE_NODE', id: field.id, patch: { options } });
  return (
    <fieldset className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Options</legend>
      {field.options.map((option, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input aria-label={`Option ${i + 1} label`} className={inputClass} value={option.label} placeholder="Label" onChange={(e) => update(field.options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)))} />
          <input aria-label={`Option ${i + 1} value`} className={`${inputClass} font-mono text-xs`} value={option.value} placeholder="value" onChange={(e) => update(field.options.map((o, j) => (j === i ? { ...o, value: e.target.value } : o)))} />
          <button type="button" aria-label={`Remove option ${i + 1}`} className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => update(field.options.filter((_, j) => j !== i))}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => update([...field.options, { label: `Option ${field.options.length + 1}`, value: `option${field.options.length + 1}` }])}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add option
      </Button>
    </fieldset>
  );
}

function ValidationEditor({ field }: { field: FieldNode }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const v = field.validation;
  const set = (patch: Partial<Validation>) => {
    const next: Validation = { ...v, ...patch };
    (Object.keys(next) as Array<keyof Validation>).forEach((k) => next[k] === undefined && delete next[k]);
    dispatch({ type: 'UPDATE_NODE', id: field.id, patch: { validation: next } });
  };
  const textish = field.type === 'text' || field.type === 'textarea';
  return (
    <fieldset className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Validation</legend>
      {(textish || field.type === 'email') && (
        <div className="grid grid-cols-2 gap-2">
          {textish && (
            <Row label="Min length">
              <input type="number" min={0} className={inputClass} value={v.minLength ?? ''} onChange={(e) => set({ minLength: numberOrUndefined(e.target.value) })} />
            </Row>
          )}
          <Row label="Max length">
            <input type="number" min={0} className={inputClass} value={v.maxLength ?? ''} onChange={(e) => set({ maxLength: numberOrUndefined(e.target.value) })} />
          </Row>
        </div>
      )}
      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-2">
          <Row label="Minimum">
            <input type="number" className={inputClass} value={v.min ?? ''} onChange={(e) => set({ min: numberOrUndefined(e.target.value) })} />
          </Row>
          <Row label="Maximum">
            <input type="number" className={inputClass} value={v.max ?? ''} onChange={(e) => set({ max: numberOrUndefined(e.target.value) })} />
          </Row>
        </div>
      )}
      {field.type === 'multiselect' && (
        <div className="grid grid-cols-2 gap-2">
          <Row label="Min selected">
            <input type="number" min={0} className={inputClass} value={v.minLength ?? ''} onChange={(e) => set({ minLength: numberOrUndefined(e.target.value) })} />
          </Row>
          <Row label="Max selected">
            <input type="number" min={0} className={inputClass} value={v.maxLength ?? ''} onChange={(e) => set({ maxLength: numberOrUndefined(e.target.value) })} />
          </Row>
        </div>
      )}
      {textish && (
        <>
          <Row label="Pattern (regex)" hint="e.g. ^01[3-9]\\d{8}$ for a BD mobile number">
            <input className={`${inputClass} font-mono text-xs`} value={v.pattern ?? ''} onChange={(e) => set({ pattern: e.target.value || undefined })} />
          </Row>
          {v.pattern && (
            <Row label="Pattern error message">
              <input className={inputClass} value={v.patternMessage ?? ''} onChange={(e) => set({ patternMessage: e.target.value || undefined })} />
            </Row>
          )}
        </>
      )}
      {field.type === 'checkbox' || field.type === 'date' || field.type === 'select' || field.type === 'radio' ? <p className="text-xs text-slate-400">Only "required" applies to this field type.</p> : null}
    </fieldset>
  );
}

function FieldProperties({ field, candidates }: { field: FieldNode; candidates: FieldNode[] }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const patch = (p: Partial<FieldNode>) => dispatch({ type: 'UPDATE_NODE', id: field.id, patch: p });
  const showPlaceholder = !['checkbox', 'radio', 'multiselect', 'date'].includes(field.type);
  return (
    <>
      <Row label="Label">
        <input className={inputClass} value={field.label} onChange={(e) => patch({ label: e.target.value })} />
      </Row>
      <Row label="Key" hint="Property name in the submitted data and JSON Schema.">
        <input className={`${inputClass} font-mono text-xs`} value={field.key} onChange={(e) => patch({ key: e.target.value })} onBlur={(e) => patch({ key: e.target.value })} />
      </Row>
      {showPlaceholder && (
        <Row label="Placeholder">
          <input className={inputClass} value={field.placeholder ?? ''} onChange={(e) => patch({ placeholder: e.target.value || undefined })} />
        </Row>
      )}
      <Row label="Help text">
        <input className={inputClass} value={field.helpText ?? ''} onChange={(e) => patch({ helpText: e.target.value || undefined })} />
      </Row>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={field.required} onChange={(e) => patch({ required: e.target.checked })} />
        Required
      </label>
      {hasOptions(field.type) && <OptionsEditor field={field} />}
      <ValidationEditor field={field} />
      <ConditionEditor node={field} candidates={candidates} />
    </>
  );
}

function SectionProperties({ section, candidates }: { section: SectionNode; candidates: FieldNode[] }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const patch = (p: Partial<SectionNode>) => dispatch({ type: 'UPDATE_NODE', id: section.id, patch: p });
  return (
    <>
      <Row label="Title">
        <input className={inputClass} value={section.label} onChange={(e) => patch({ label: e.target.value })} />
      </Row>
      <Row label="Key" hint="Fields inside are nested under this key.">
        <input className={`${inputClass} font-mono text-xs`} value={section.key} onChange={(e) => patch({ key: e.target.value })} />
      </Row>
      <Row label="Description">
        <textarea rows={2} className={inputClass} value={section.description ?? ''} onChange={(e) => patch({ description: e.target.value || undefined })} />
      </Row>
      <ConditionEditor node={section} candidates={candidates} />
    </>
  );
}

export function PropertyPanel() {
  const definition = useBuilderStore((s) => s.definition);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const dispatch = useBuilderStore((s) => s.dispatch);
  const location = selectedId ? findNode(definition.nodes, selectedId) : null;

  if (!location) {
    return (
      <aside aria-label="Properties" className="h-full overflow-y-auto p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Form</h2>
        <div className="mt-3 space-y-3">
          <Row label="Title">
            <input className={inputClass} value={definition.title} onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { title: e.target.value } })} />
          </Row>
          <Row label="Description">
            <textarea rows={3} className={inputClass} value={definition.description ?? ''} onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { description: e.target.value || undefined } })} />
          </Row>
          <p className="text-xs text-slate-500 dark:text-slate-400">Select a field on the canvas to edit its properties.</p>
        </div>
      </aside>
    );
  }

  const { node } = location;
  // A rule may reference any other field in the form, but not the node itself or its own children.
  const excluded = new Set(flatten([node]).map((n) => n.id));
  const candidates = flatten(definition.nodes).filter((n): n is FieldNode => isField(n) && !excluded.has(n.id));

  return (
    <aside aria-label="Properties" className="h-full overflow-y-auto p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{FIELD_TYPE_LABELS[node.type]} properties</h2>
      <div className="mt-3 space-y-3">{isSection(node) ? <SectionProperties section={node} candidates={candidates} /> : <FieldProperties field={node} candidates={candidates} />}</div>
    </aside>
  );
}
