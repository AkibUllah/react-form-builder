import { useCallback, useEffect, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { FIELD_TYPE_LABELS, childrenOf, findNode, useBuilderStore } from '@/lib';
import type { NodeType } from '@/lib';
import { Canvas, ROOT_CONTAINER, SECTION_PREFIX } from './components/Canvas';
import { Palette, PALETTE_PREFIX } from './components/Palette';
import { PropertyPanel } from './components/PropertyPanel';
import { Toolbar } from './components/Toolbar';
import { ExportModal } from './components/ExportModal';
import { ImportModal } from './components/ImportModal';
import { PreviewModal } from './components/PreviewModal';
import { FIELD_ICONS } from './components/fieldIcons';

type ModalName = 'preview' | 'export' | 'import' | null;

interface DropTarget {
  parentId: string | null;
  index: number;
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem('form-builder:theme');
      if (stored) return stored === 'dark';
    } catch {
      // ignore
    }
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('form-builder:theme', dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export default function App() {
  const dispatch = useBuilderStore((s) => s.dispatch);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const [modal, setModal] = useState<ModalName>(null);
  const [active, setActive] = useState<{ label: string; type: NodeType } | null>(null);
  const { dark, toggle } = useTheme();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  /** Translate whatever we are hovering into a container + index. */
  const resolveTarget = useCallback((overId: string, activeId: string): DropTarget | null => {
    const { definition } = useBuilderStore.getState();
    if (overId === ROOT_CONTAINER) return { parentId: null, index: definition.nodes.length };
    if (overId.startsWith(SECTION_PREFIX)) {
      const parentId = overId.slice(SECTION_PREFIX.length);
      return { parentId, index: childrenOf(definition, parentId).length };
    }
    const location = findNode(definition.nodes, overId);
    if (!location) return null;
    const parentId = location.parent?.id ?? null;
    // Dropping onto a node takes its position; when dragging within the same list
    // dnd-kit's arrayMove semantics apply (remove, then insert at that index).
    if (activeId === overId) return null;
    return { parentId, index: location.index };
  }, []);

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(PALETTE_PREFIX)) {
      const type = id.slice(PALETTE_PREFIX.length) as NodeType;
      setActive({ label: FIELD_TYPE_LABELS[type], type });
      return;
    }
    const node = findNode(useBuilderStore.getState().definition.nodes, id)?.node;
    if (node) setActive({ label: node.label, type: node.type });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActive(null);
    const { active: dragged, over } = event;
    if (!over) return;
    const activeId = String(dragged.id);
    const target = resolveTarget(String(over.id), activeId);
    if (!target) return;

    if (activeId.startsWith(PALETTE_PREFIX)) {
      dispatch({ type: 'ADD_NODE', nodeType: activeId.slice(PALETTE_PREFIX.length) as NodeType, parentId: target.parentId, index: target.index });
      return;
    }
    dispatch({ type: 'MOVE_NODE', id: activeId, parentId: target.parentId, index: target.index });
  };

  const ActiveIcon = active ? FIELD_ICONS[active.type] : null;

  return (
    <div className="flex h-full flex-col">
      <Toolbar onPreview={() => setModal('preview')} onExport={() => setModal('export')} onImport={() => setModal('import')} dark={dark} onToggleTheme={toggle} />
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:border-b-0 lg:border-r">
            <Palette />
          </div>
          <div className="min-h-[50vh] bg-slate-100 dark:bg-slate-950">
            <Canvas />
          </div>
          <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:border-l lg:border-t-0">
            <PropertyPanel />
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {active && ActiveIcon && (
            <div className="flex items-center gap-2 rounded-md border border-brand-400 bg-white px-3 py-2 text-sm shadow-lg dark:bg-slate-900">
              <ActiveIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {active.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <PreviewModal open={modal === 'preview'} onClose={() => setModal(null)} />
      <ExportModal open={modal === 'export'} onClose={() => setModal(null)} />
      <ImportModal open={modal === 'import'} onClose={() => setModal(null)} />
    </div>
  );
}
