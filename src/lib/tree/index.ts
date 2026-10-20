import type { FormDefinition, FormNode, SectionNode } from '../types';
import { isSection } from '../types';

export interface NodeLocation {
  node: FormNode;
  parent: SectionNode | null;
  index: number;
}

/** Depth-first walk yielding every node with its parent. */
export function* walk(nodes: readonly FormNode[], parent: SectionNode | null = null): Generator<NodeLocation> {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index] as FormNode;
    yield { node, parent, index };
    if (isSection(node)) yield* walk(node.children, node);
  }
}

export function flatten(nodes: readonly FormNode[]): FormNode[] {
  return [...walk(nodes)].map((l) => l.node);
}

export function findNode(nodes: readonly FormNode[], id: string): NodeLocation | null {
  for (const location of walk(nodes)) {
    if (location.node.id === id) return location;
  }
  return null;
}

export function findByKey(nodes: readonly FormNode[], key: string): FormNode | null {
  for (const { node } of walk(nodes)) {
    if (node.key === key) return node;
  }
  return null;
}

export function allKeys(nodes: readonly FormNode[]): Set<string> {
  return new Set(flatten(nodes).map((n) => n.key));
}

/** True when `maybeChildId` is inside the subtree rooted at `ancestorId`. */
export function isDescendant(nodes: readonly FormNode[], ancestorId: string, maybeChildId: string): boolean {
  const ancestor = findNode(nodes, ancestorId)?.node;
  if (!ancestor || !isSection(ancestor)) return false;
  return findNode(ancestor.children, maybeChildId) !== null;
}

/** Children of the container identified by `parentId` (null = root). */
export function childrenOf(definition: FormDefinition, parentId: string | null): FormNode[] {
  if (parentId === null) return definition.nodes;
  const parent = findNode(definition.nodes, parentId)?.node;
  return parent && isSection(parent) ? parent.children : [];
}

/** Immutable removal; returns the new tree and the removed node (if any). */
export function removeNode(nodes: readonly FormNode[], id: string): { nodes: FormNode[]; removed: FormNode | null } {
  let removed: FormNode | null = null;
  const next: FormNode[] = [];
  for (const node of nodes) {
    if (node.id === id) {
      removed = node;
      continue;
    }
    if (isSection(node)) {
      const result = removeNode(node.children, id);
      if (result.removed) removed = result.removed;
      next.push(result.removed ? { ...node, children: result.nodes } : node);
    } else {
      next.push(node);
    }
  }
  return { nodes: next, removed };
}

/** Immutable insertion into `parentId` (null = root) at `index` (clamped). */
export function insertNode(nodes: readonly FormNode[], parentId: string | null, index: number, node: FormNode): FormNode[] {
  if (parentId === null) {
    const copy = [...nodes];
    copy.splice(clamp(index, copy.length), 0, node);
    return copy;
  }
  return nodes.map((n) => {
    if (!isSection(n)) return n;
    if (n.id === parentId) {
      const children = [...n.children];
      children.splice(clamp(index, children.length), 0, node);
      return { ...n, children };
    }
    return { ...n, children: insertNode(n.children, parentId, index, node) };
  });
}

/** Immutable in-place update of one node. */
export function updateNode(nodes: readonly FormNode[], id: string, updater: (node: FormNode) => FormNode): FormNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n);
    if (isSection(n)) return { ...n, children: updateNode(n.children, id, updater) };
    return n;
  });
}

function clamp(index: number, length: number): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(index, length);
}

/** Deep clone a node assigning fresh ids and keys via the supplied generators. */
export function cloneNode(node: FormNode, nextId: () => string, nextKey: (key: string) => string): FormNode {
  if (isSection(node)) {
    return { ...node, id: nextId(), key: nextKey(node.key), children: node.children.map((c) => cloneNode(c, nextId, nextKey)) };
  }
  return { ...node, id: nextId(), key: nextKey(node.key), validation: { ...node.validation }, options: node.options.map((o) => ({ ...o })) };
}
