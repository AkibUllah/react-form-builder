import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { toJsonSchema, useBuilderStore } from '@/lib';
import { Button } from './Button';
import { Modal } from './Modal';

type Tab = 'combined' | 'schema' | 'uiSchema';

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const definition = useBuilderStore((s) => s.definition);
  const [tab, setTab] = useState<Tab>('combined');
  const [copied, setCopied] = useState(false);
  const exported = useMemo(() => toJsonSchema(definition), [definition]);

  const text = useMemo(() => {
    const value = tab === 'combined' ? exported : tab === 'schema' ? exported.schema : exported.uiSchema;
    return JSON.stringify(value, null, 2);
  }, [exported, tab]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context); the textarea is selectable.
    }
  };

  const slug = definition.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'form';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export"
      description="JSON Schema draft-07 describes the data; the UI schema carries widgets, placeholders, help and conditions."
      wide
      footer={
        <>
          <Button onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="primary" onClick={() => download(`${slug}.${tab === 'combined' ? 'form' : tab === 'schema' ? 'schema' : 'ui'}.json`, text)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </Button>
        </>
      }
    >
      <div role="tablist" className="mb-3 flex gap-1 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
        {(
          [
            ['combined', 'Combined'],
            ['schema', 'JSON Schema'],
            ['uiSchema', 'UI Schema'],
          ] as Array<[Tab, string]>
        ).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${tab === value ? 'bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>
      <textarea readOnly aria-label="Exported JSON" value={text} rows={22} className="w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
    </Modal>
  );
}
