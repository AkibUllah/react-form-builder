import { describe, expect, it } from 'vitest';
import { allKeys, findNode, flatten, insertNode, isDescendant, removeNode, updateNode } from './index';
import { EXAMPLE_FORM } from '@/app/example';
import type { FieldNode } from '../types';
import { normalizeKey, slugifyKey, uniqueKey } from '../ids';

const nodes = EXAMPLE_FORM.nodes;

describe('tree helpers', () => {
  it('flattens nested sections depth-first and collects keys', () => {
    const keys = flatten(nodes).map((n) => n.key);
    expect(keys).toContain('address');
    expect(keys.indexOf('division')).toBe(keys.indexOf('address') + 1);
    expect(allKeys(nodes).size).toBe(keys.length);
  });

  it('finds nodes with their parent and index', () => {
    const street = findNode(nodes, 'f_street');
    expect(street?.parent?.id).toBe('s_address');
    expect(street?.index).toBe(1);
    expect(findNode(nodes, 'nope')).toBeNull();
    expect(findNode(nodes, 'f_business')?.parent).toBeNull();
  });

  it('detects descendants', () => {
    expect(isDescendant(nodes, 's_address', 'f_postcode')).toBe(true);
    expect(isDescendant(nodes, 's_address', 'f_email')).toBe(false);
    expect(isDescendant(nodes, 'f_email', 'f_business')).toBe(false);
  });

  it('removes and inserts immutably', () => {
    const { nodes: without, removed } = removeNode(nodes, 'f_street');
    expect(removed?.id).toBe('f_street');
    expect(findNode(without, 'f_street')).toBeNull();
    expect(findNode(nodes, 'f_street')).not.toBeNull(); // original untouched

    const back = insertNode(without, 's_address', 0, removed as FieldNode);
    expect(findNode(back, 'f_street')?.index).toBe(0);
    const atEnd = insertNode(without, null, 999, removed as FieldNode);
    expect(atEnd[atEnd.length - 1]?.id).toBe('f_street');
  });

  it('updates a nested node in place', () => {
    const next = updateNode(nodes, 'f_postcode', (n) => ({ ...n, label: 'ZIP' }));
    expect(findNode(next, 'f_postcode')?.node.label).toBe('ZIP');
    expect(findNode(nodes, 'f_postcode')?.node.label).toBe('Post code');
  });
});

describe('key helpers', () => {
  it('slugifies labels to camelCase and keeps valid identifiers', () => {
    expect(slugifyKey('Full name')).toBe('fullName');
    expect(slugifyKey('  NID (17 digit)  ')).toBe('nid17Digit');
    expect(slugifyKey('123 go')).toBe('f123Go');
    expect(slugifyKey('')).toBe('field');
    expect(normalizeKey('businessName')).toBe('businessName');
    expect(normalizeKey('snake_case_2')).toBe('snake_case_2');
    expect(normalizeKey('Business Name')).toBe('businessName');
  });

  it('makes keys unique with numeric suffixes', () => {
    const taken = new Set(['email', 'email2']);
    expect(uniqueKey('email', taken)).toBe('email3');
    expect(uniqueKey('phone', taken)).toBe('phone');
  });
});
