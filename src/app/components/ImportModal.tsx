import { useState } from 'react';
import { parseExportedJson, useBuilderStore } from '@/lib';
import { Button } from './Button';
import { Modal } from './Modal';

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      const definition = parseExportedJson(text);
      dispatch({ type: 'LOAD', definition });
      setText('');
      setError(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import this schema');
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setError(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import"
      description="Paste a combined export ({ schema, uiSchema }) or a bare JSON Schema draft-07 object."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={text.trim() === ''}>
            Import
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Choose a file</span>
          <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700 dark:text-slate-300" />
        </label>
        <textarea
          aria-label="Schema JSON"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          rows={14}
          placeholder='{"schema": {...}, "uiSchema": {...}}'
          className="w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
