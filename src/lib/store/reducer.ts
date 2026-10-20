import { createId, normalizeKey, slugifyKey, uniqueKey } from '../ids';
import { allKeys, childrenOf, cloneNode, findNode, insertNode, isDescendant, removeNode, updateNode } from '../tree';
import type { FieldNode, FieldType, FormDefinition, FormNode, NodeType, SectionNode } from '../types';
import { FIELD_TYPE_LABELS, hasOptions, isSection } from '../types';

export interface BuilderState {
  definition: FormDefinition;
  selectedId: string | null;
}

export type BuilderAction =
  | { type: 'ADD_NODE'; nodeType: NodeType; parentId: string | null; index: number; id?: string }
  | { type: 'MOVE_NODE'; id: string; parentId: string | null; index: number }
  | { type: 'REMOVE_NODE'; id: string }
  | { type: 'DUPLICATE_NODE'; id: string }
  | { type: 'UPDATE_NODE'; id: string; patch: Partial<FieldNode> | Partial<SectionNode> }
  | { type: 'SELECT'; id: string | null }
  | { type: 'UPDATE_FORM'; patch: Partial<Pick<FormDefinition, 'title' | 'description'>> }
  | { type: 'LOAD'; definition: FormDefinition }
  | { type: 'RESET' };

export function createEmptyDefinition(): FormDefinition {
  return { version: 1, id: createId('form'), title: 'Untitled form', nodes: [] };
}

export const initialBuilderState: BuilderState = {
  definition: createEmptyDefinition(),
  selectedId: null,
};

const DEFAULT_OPTIONS = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
];

/** Build a node of `type` with sensible defaults and a key unique within `taken`. */
export function createNode(type: NodeType, taken: ReadonlySet<string>, id = createId()): FormNode {
  const label = FIELD_TYPE_LABELS[type];
  const key = uniqueKey(slugifyKey(label), taken);
  if (type === 'section') {
    return { id, type, key, label: 'Section', children: [] };
  }
  const field: FieldNode = {
    id,
    type,
    key,
    label,
    required: false,
    validation: {},
    options: hasOptions(type) ? DEFAULT_OPTIONS.map((o) => ({ ...o })) : [],
  };
  if (type === 'checkbox') field.defaultValue = false;
  if (type === 'multiselect') field.defaultValue = [];
  return field;
}

function withKeyUniqueness(nodes: FormNode[], id: string, patch: Partial<FormNode>): Partial<FormNode> {
  if (typeof patch.key !== 'string') return patch;
  const taken = new Set([...allKeys(nodes)]);
  const current = findNode(nodes, id)?.node;
  if (current) taken.delete(current.key);
  const clean = normalizeKey(patch.key) || 'field';
  return { ...patch, key: uniqueKey(clean, taken) };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  const { definition } = state;
  switch (action.type) {
    case 'ADD_NODE': {
      const node = createNode(action.nodeType, allKeys(definition.nodes), action.id ?? createId());
      return {
        definition: { ...definition, nodes: insertNode(definition.nodes, action.parentId, action.index, node) },
        selectedId: node.id,
      };
    }

    case 'MOVE_NODE': {
      if (action.parentId === action.id || (action.parentId && isDescendant(definition.nodes, action.id, action.parentId))) {
        return state; // cannot drop a section into itself
      }
      const target = action.parentId ? findNode(definition.nodes, action.parentId)?.node : null;
      if (action.parentId && (!target || !isSection(target))) return state;

      // Semantics match dnd-kit's arrayMove: remove first, then insert at `index` in the resulting list.
      const { nodes: without, removed } = removeNode(definition.nodes, action.id);
      if (!removed) return state;
      return { ...state, definition: { ...definition, nodes: insertNode(without, action.parentId, action.index, removed) } };
    }

    case 'REMOVE_NODE': {
      const { nodes, removed } = removeNode(definition.nodes, action.id);
      if (!removed) return state;
      return {
        definition: { ...definition, nodes },
        selectedId: state.selectedId === action.id || (isSection(removed) && findNode(removed.children, state.selectedId ?? '')) ? null : state.selectedId,
      };
    }

    case 'DUPLICATE_NODE': {
      const location = findNode(definition.nodes, action.id);
      if (!location) return state;
      const taken = new Set(allKeys(definition.nodes));
      const copy = cloneNode(location.node, () => createId(), (key) => {
        const next = uniqueKey(key, taken);
        taken.add(next);
        return next;
      });
      return {
        definition: { ...definition, nodes: insertNode(definition.nodes, location.parent?.id ?? null, location.index + 1, copy) },
        selectedId: copy.id,
      };
    }

    case 'UPDATE_NODE': {
      const patch = withKeyUniqueness(definition.nodes, action.id, action.patch as Partial<FormNode>);
      return {
        ...state,
        definition: {
          ...definition,
          nodes: updateNode(definition.nodes, action.id, (node) => ({ ...node, ...patch }) as FormNode),
        },
      };
    }

    case 'SELECT':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id };

    case 'UPDATE_FORM':
      return { ...state, definition: { ...definition, ...action.patch } };

    case 'LOAD':
      return { definition: action.definition, selectedId: null };

    case 'RESET':
      return { definition: createEmptyDefinition(), selectedId: null };

    default:
      return state;
  }
}

/** Convenience used by drag-and-drop: index of a node within its container. */
export function indexWithin(definition: FormDefinition, parentId: string | null, nodeId: string): number {
  return childrenOf(definition, parentId).findIndex((n) => n.id === nodeId);
}

export type { FieldType };
