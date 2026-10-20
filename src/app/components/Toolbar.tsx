import { Download, Eraser, Eye, FileInput, Moon, Redo2, Sparkles, Sun, Undo2 } from 'lucide-react';
import { useBuilderStore } from '@/lib';
import { Button } from './Button';
import { EXAMPLE_FORM } from '../example';

interface ToolbarProps {
  onPreview: () => void;
  onExport: () => void;
  onImport: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}

export function Toolbar({ onPreview, onExport, onImport, dark, onToggleTheme }: ToolbarProps) {
  const title = useBuilderStore((s) => s.definition.title);
  const fieldCount = useBuilderStore((s) => s.definition.nodes.length);
  const dispatch = useBuilderStore((s) => s.dispatch);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const canUndo = useBuilderStore((s) => s.past.length > 0);
  const canRedo = useBuilderStore((s) => s.future.length > 0);
  const appName = import.meta.env.VITE_APP_NAME ?? 'Form Builder';

  const clear = () => {
    if (fieldCount === 0 || window.confirm('Remove every field from this form?')) dispatch({ type: 'RESET' });
  };

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mr-auto flex min-w-0 items-center gap-3">
        <span className="hidden text-sm font-semibold text-brand-700 dark:text-brand-300 sm:block">{appName}</span>
        <span className="hidden text-slate-300 sm:block">/</span>
        <input
          aria-label="Form title"
          value={title}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { title: e.target.value } })}
          className="min-w-0 max-w-xs rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-900 hover:border-slate-300 focus:border-brand-500 focus:outline-none dark:text-slate-50 dark:hover:border-slate-700"
        />
      </div>
      <Button variant="ghost" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Undo2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
        <Redo2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" onClick={() => dispatch({ type: 'LOAD', definition: EXAMPLE_FORM })} title="Load the example form">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Example</span>
      </Button>
      <Button variant="ghost" onClick={clear} title="Clear the canvas">
        <Eraser className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Clear</span>
      </Button>
      <Button onClick={onImport}>
        <FileInput className="h-4 w-4" aria-hidden="true" />
        Import
      </Button>
      <Button onClick={onExport}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Export
      </Button>
      <Button variant="primary" onClick={onPreview}>
        <Eye className="h-4 w-4" aria-hidden="true" />
        Preview
      </Button>
      <Button variant="ghost" onClick={onToggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </header>
  );
}
