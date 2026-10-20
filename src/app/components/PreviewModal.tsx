import { useState } from 'react';
import { FormRenderer, useBuilderStore } from '@/lib';
import { Button } from './Button';
import { Modal } from './Modal';

export function PreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const definition = useBuilderStore((s) => s.definition);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const close = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Preview" description="Live form rendered from the current definition with generated zod validation." wide>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FormRenderer key={JSON.stringify(definition)} definition={definition} onSubmit={(values) => setResult(values)} />
        </div>
        <aside className="lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Submitted data</h3>
          <pre className="mt-2 min-h-[160px] overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{result ? JSON.stringify(result, null, 2) : '// submit the form to see the payload'}</pre>
          {result && (
            <Button className="mt-2" onClick={() => setResult(null)}>
              Clear
            </Button>
          )}
        </aside>
      </div>
    </Modal>
  );
}
