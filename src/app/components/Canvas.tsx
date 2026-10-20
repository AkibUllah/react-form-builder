import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react';
import { FIELD_TYPE_LABELS, isSection, useBuilderStore } from '@/lib';
import type { FormNode } from '@/lib';
import { cn } from '@/lib/cn';
import { FIELD_ICONS } from './fieldIcons';

export const ROOT_CONTAINER = 'container:root';
export const SECTION_PREFIX = 'container:';

interface ContainerProps {
  parentId: string | null;
  nodes: FormNode[];
  depth: number;
}

function Container({ parentId, nodes, depth }: ContainerProps) {
  const droppableId = parentId === null ? ROOT_CONTAINER : `${SECTION_PREFIX}${parentId}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, data: { container: parentId } });
  return (
    <SortableContext id={droppableId} items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        data-testid={droppableId}
        className={cn(
          'space-y-2 rounded-lg transition-colors',
          nodes.length === 0 && 'flex min-h-[72px] items-center justify-center border-2 border-dashed text-sm text-slate-400',
          nodes.length === 0 && (isOver ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-700'),
          nodes.length > 0 && isOver && 'ring-2 ring-brand-300 ring-offset-2 dark:ring-offset-slate-950',
        )}
      >
        {nodes.length === 0 && (parentId === null ? 'Drop a field here to start' : 'Drop fields into this section')}
        {nodes.map((node, index) => (
          <CanvasNode key={node.id} node={node} parentId={parentId} index={index} count={nodes.length} depth={depth} />
        ))}
      </div>
    </SortableContext>
  );
}

interface CanvasNodeProps {
  node: FormNode;
  parentId: string | null;
  index: number;
  count: number;
  depth: number;
}

function CanvasNode({ node, parentId, index, count, depth }: CanvasNodeProps) {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const selected = useBuilderStore((s) => s.selectedId === node.id);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { source: 'canvas', parentId, index },
  });
  const Icon = FIELD_ICONS[node.type];
  const section = isSection(node);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group rounded-lg border bg-white shadow-sm dark:bg-slate-900',
        selected ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
        isDragging && 'opacity-40',
      )}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT', id: node.id });
      }}
      data-testid={`node-${node.key}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Drag ${node.label}`} className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing dark:hover:bg-slate-800">
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <Icon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
            {node.label}
            {!section && node.required && <span className="ml-0.5 text-red-600">*</span>}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {FIELD_TYPE_LABELS[node.type]} · <code>{node.key}</code>
            {node.visibleWhen && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">conditional</span>}
          </p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <IconButton label="Move up" disabled={index === 0} onClick={() => dispatch({ type: 'MOVE_NODE', id: node.id, parentId, index: index - 1 })}>
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Move down" disabled={index === count - 1} onClick={() => dispatch({ type: 'MOVE_NODE', id: node.id, parentId, index: index + 1 })}>
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Duplicate" onClick={() => dispatch({ type: 'DUPLICATE_NODE', id: node.id })}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Delete" danger onClick={() => dispatch({ type: 'REMOVE_NODE', id: node.id })}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      {section && (
        <div className={cn('border-t border-slate-200 p-2 dark:border-slate-800', depth % 2 === 0 ? 'bg-slate-50 dark:bg-slate-950/40' : 'bg-white dark:bg-slate-900')}>
          <Container parentId={node.id} nodes={node.children} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('rounded p-1 disabled:opacity-30', danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}
    >
      {children}
    </button>
  );
}

export function Canvas() {
  const nodes = useBuilderStore((s) => s.definition.nodes);
  const dispatch = useBuilderStore((s) => s.dispatch);
  return (
    <section aria-label="Form canvas" className="h-full overflow-y-auto p-4 sm:p-6" onClick={() => dispatch({ type: 'SELECT', id: null })}>
      <div className="mx-auto max-w-2xl">
        <Container parentId={null} nodes={nodes} depth={0} />
      </div>
    </section>
  );
}
