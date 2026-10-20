import { describe, expect, it } from 'vitest';
import { builderReducer, createNode, initialBuilderState } from './reducer';
import type { BuilderState } from './reducer';
import { childrenOf, findNode } from '../tree';
import { isSection } from '../types';
import { EXAMPLE_FORM } from '@/app/example';

const loaded: BuilderState = { definition: EXAMPLE_FORM, selectedId: null };
const rootIds = () => loaded.definition.nodes.map((n) => n.id);

describe('builderReducer', () => {
  it('adds nodes with unique keys and selects them', () => {
    let state = initialBuilderState;
    state = builderReducer(state, { type: 'ADD_NODE', nodeType: 'text', parentId: null, index: 0, id: 'a' });
    state = builderReducer(state, { type: 'ADD_NODE', nodeType: 'text', parentId: null, index: 1, id: 'b' });
    state = builderReducer(state, { type: 'ADD_NODE', nodeType: 'section', parentId: null, index: 2, id: 's' });
    state = builderReducer(state, { type: 'ADD_NODE', nodeType: 'email', parentId: 's', index: 0, id: 'c' });
    expect(state.definition.nodes.map((n) => n.key)).toEqual(['text', 'text2', 'section']);
    expect(childrenOf(state.definition, 's').map((n) => n.key)).toEqual(['email']);
    expect(state.selectedId).toBe('c');
  });

  it('creates option defaults for choice fields only', () => {
    const select = createNode('select', new Set());
    const text = createNode('text', new Set());
    expect(!isSection(select) && select.options.length).toBe(2);
    expect(!isSection(text) && text.options.length).toBe(0);
  });

  it('moves nodes within a container using arrayMove semantics', () => {
    const ids = rootIds();
    const down = builderReducer(loaded, { type: 'MOVE_NODE', id: ids[0] as string, parentId: null, index: 2 });
    expect(down.definition.nodes.slice(0, 3).map((n) => n.id)).toEqual([ids[1], ids[2], ids[0]]);
    const up = builderReducer(loaded, { type: 'MOVE_NODE', id: ids[3] as string, parentId: null, index: 1 });
    expect(up.definition.nodes.slice(0, 4).map((n) => n.id)).toEqual([ids[0], ids[3], ids[1], ids[2]]);
  });

  it('moves nodes between containers', () => {
    const state = builderReducer(loaded, { type: 'MOVE_NODE', id: 'f_email', parentId: 's_address', index: 0 });
    expect(childrenOf(state.definition, 's_address')[0]?.id).toBe('f_email');
    expect(state.definition.nodes.some((n) => n.id === 'f_email')).toBe(false);
    const out = builderReducer(state, { type: 'MOVE_NODE', id: 'f_email', parentId: null, index: 0 });
    expect(out.definition.nodes[0]?.id).toBe('f_email');
  });

  it('refuses to drop a section into itself or its descendants', () => {
    const nested = builderReducer(loaded, { type: 'ADD_NODE', nodeType: 'section', parentId: 's_address', index: 0, id: 'inner' });
    expect(builderReducer(nested, { type: 'MOVE_NODE', id: 's_address', parentId: 's_address', index: 0 })).toBe(nested);
    expect(builderReducer(nested, { type: 'MOVE_NODE', id: 's_address', parentId: 'inner', index: 0 })).toBe(nested);
    expect(builderReducer(nested, { type: 'MOVE_NODE', id: 'f_email', parentId: 'f_business', index: 0 })).toBe(nested); // not a section
  });

  it('removes nodes and clears selection of removed descendants', () => {
    const selected: BuilderState = { ...loaded, selectedId: 'f_street' };
    const state = builderReducer(selected, { type: 'REMOVE_NODE', id: 's_address' });
    expect(findNode(state.definition.nodes, 'f_street')).toBeNull();
    expect(state.selectedId).toBeNull();
    expect(builderReducer(loaded, { type: 'REMOVE_NODE', id: 'ghost' })).toBe(loaded);
  });

  it('duplicates a section deeply with fresh ids and unique keys', () => {
    const state = builderReducer(loaded, { type: 'DUPLICATE_NODE', id: 's_address' });
    const copy = state.definition.nodes[7];
    expect(copy && isSection(copy) && copy.key).toBe('address2');
    expect(copy && isSection(copy) && copy.children.map((c) => c.key)).toEqual(['division2', 'street2', 'postcode2']);
    expect(copy?.id).not.toBe('s_address');
    expect(state.selectedId).toBe(copy?.id);
  });

  it('updates nodes and keeps keys unique and well-formed', () => {
    const renamed = builderReducer(loaded, { type: 'UPDATE_NODE', id: 'f_email', patch: { key: 'Business Name' } });
    expect(findNode(renamed.definition.nodes, 'f_email')?.node.key).toBe('businessName2');
    const same = builderReducer(loaded, { type: 'UPDATE_NODE', id: 'f_email', patch: { key: 'email', label: 'E-mail' } });
    expect(findNode(same.definition.nodes, 'f_email')?.node).toMatchObject({ key: 'email', label: 'E-mail' });
  });

  it('handles select, form patch, load and reset', () => {
    let state = builderReducer(loaded, { type: 'SELECT', id: 'f_email' });
    expect(state.selectedId).toBe('f_email');
    expect(builderReducer(state, { type: 'SELECT', id: 'f_email' })).toBe(state);
    state = builderReducer(state, { type: 'UPDATE_FORM', patch: { title: 'KYC' } });
    expect(state.definition.title).toBe('KYC');
    state = builderReducer(state, { type: 'RESET' });
    expect(state.definition.nodes).toEqual([]);
    expect(state.selectedId).toBeNull();
    state = builderReducer(state, { type: 'LOAD', definition: EXAMPLE_FORM });
    expect(state.definition.id).toBe('merchant-onboarding');
  });
});
