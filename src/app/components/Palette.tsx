import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { FIELD_TYPES, FIELD_TYPE_LABELS, useBuilderStore } from '@/lib';
import type { NodeType } from '@/lib';
import { FIELD_ICONS } from './fieldIcons';

export const PALETTE_PREFIX = 'palette:';
const PALETTE_TYPES: NodeType[] = ['section', ...FIELD_TYPES];

function PaletteItem({ type }: { type: NodeType }) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const rootCount = useBuilderStore((s) => s.definition.nodes.length);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
    data: { source: 'palette', nodeType: type },
  });
  const Icon = FIELD_ICONS[type];
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Add ${FIELD_TYPE_LABELS[type]}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') dispatch({ type: 'ADD_NODE', nodeType: type, parentId: null, index: rootCount });
      }}
      onDoubleClick={() => dispatch({ type: 'ADD_NODE', nodeType: type, parentId: null, index: rootCount })}
      className={`flex cursor-grab items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${isDragging ? 'opacity-40' : ''}`}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <Icon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
      <span className="flex-1 truncate">{FIELD_TYPE_LABELS[type]}</span>
    </div>
  );
}

export function Palette() {
  return (
    <aside aria-label="Field palette" className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fields</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag onto the canvas, or double-click / press Enter to append.</p>
      </div>
      <div className="grid gap-2">
        {PALETTE_TYPES.map((type) => (
          <PaletteItem key={type} type={type} />
        ))}
      </div>
    </aside>
  );
}
