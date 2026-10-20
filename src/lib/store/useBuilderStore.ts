import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { builderReducer, createEmptyDefinition } from './reducer';
import type { BuilderAction, BuilderState } from './reducer';
import type { FormDefinition } from '../types';

const HISTORY_LIMIT = 50;

export interface BuilderStore extends BuilderState {
  past: FormDefinition[];
  future: FormDefinition[];
  dispatch: (action: BuilderAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/** Actions that should create an undo checkpoint. Selection changes do not. */
const UNDOABLE = new Set<BuilderAction['type']>(['ADD_NODE', 'MOVE_NODE', 'REMOVE_NODE', 'DUPLICATE_NODE', 'UPDATE_NODE', 'UPDATE_FORM', 'LOAD', 'RESET']);

export const STORAGE_KEY = import.meta.env.VITE_STORAGE_KEY ?? 'form-builder:draft';

export function createBuilderStore(storageKey = STORAGE_KEY) {
  return create<BuilderStore>()(
    persist(
      (set, get) => ({
        definition: createEmptyDefinition(),
        selectedId: null,
        past: [],
        future: [],
        dispatch: (action) => {
          const { definition, selectedId, past } = get();
          const next = builderReducer({ definition, selectedId }, action);
          if (next.definition === definition && next.selectedId === selectedId) return;
          if (UNDOABLE.has(action.type) && next.definition !== definition) {
            set({ ...next, past: [...past, definition].slice(-HISTORY_LIMIT), future: [] });
          } else {
            set(next);
          }
        },
        undo: () => {
          const { past, future, definition } = get();
          const previous = past[past.length - 1];
          if (!previous) return;
          set({ definition: previous, past: past.slice(0, -1), future: [definition, ...future], selectedId: null });
        },
        redo: () => {
          const { past, future, definition } = get();
          const [next, ...rest] = future;
          if (!next) return;
          set({ definition: next, past: [...past, definition], future: rest, selectedId: null });
        },
        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ definition: state.definition }),
      },
    ),
  );
}

export const useBuilderStore = createBuilderStore();
