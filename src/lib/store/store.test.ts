import { describe, expect, it } from 'vitest';
import { createBuilderStore } from './useBuilderStore';

describe('builder store', () => {
  it('records undo history for structural changes but not selection', () => {
    const store = createBuilderStore('test:store');
    const { dispatch } = store.getState();
    dispatch({ type: 'ADD_NODE', nodeType: 'text', parentId: null, index: 0, id: 'a' });
    dispatch({ type: 'SELECT', id: null });
    dispatch({ type: 'ADD_NODE', nodeType: 'number', parentId: null, index: 1, id: 'b' });
    expect(store.getState().past).toHaveLength(2);
    expect(store.getState().definition.nodes).toHaveLength(2);

    store.getState().undo();
    expect(store.getState().definition.nodes.map((n) => n.id)).toEqual(['a']);
    store.getState().undo();
    expect(store.getState().definition.nodes).toEqual([]);
    expect(store.getState().canUndo()).toBe(false);

    store.getState().redo();
    store.getState().redo();
    expect(store.getState().definition.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(store.getState().canRedo()).toBe(false);
  });

  it('clears the redo stack after a new change and persists the definition', () => {
    const store = createBuilderStore('test:persist');
    store.getState().dispatch({ type: 'ADD_NODE', nodeType: 'text', parentId: null, index: 0, id: 'a' });
    store.getState().undo();
    expect(store.getState().future).toHaveLength(1);
    store.getState().dispatch({ type: 'ADD_NODE', nodeType: 'date', parentId: null, index: 0, id: 'c' });
    expect(store.getState().future).toHaveLength(0);

    const raw = localStorage.getItem('test:persist');
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as { state: { definition: { nodes: Array<{ id: string }> }; past?: unknown } };
    expect(saved.state.definition.nodes[0]?.id).toBe('c');
    expect(saved.state.past).toBeUndefined();
  });
});
