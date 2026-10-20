import { describe, expect, it } from 'vitest';
import { computeVisibility, evaluateCondition, flattenValues } from './conditions';
import { EXAMPLE_FORM } from '@/app/example';

describe('evaluateCondition', () => {
  it('supports every operator', () => {
    const values = { a: 'Dhaka', n: 10, list: ['x', 'y'], empty: '', flag: true };
    expect(evaluateCondition({ fieldKey: 'a', operator: 'equals', value: 'Dhaka' }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'a', operator: 'notEquals', value: 'Dhaka' }, values)).toBe(false);
    expect(evaluateCondition({ fieldKey: 'a', operator: 'contains', value: 'dha' }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'list', operator: 'contains', value: 'y' }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'list', operator: 'equals', value: 'z' }, values)).toBe(false);
    expect(evaluateCondition({ fieldKey: 'empty', operator: 'isEmpty' }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'missing', operator: 'isEmpty' }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'a', operator: 'isNotEmpty' }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'n', operator: 'greaterThan', value: 5 }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'n', operator: 'lessThan', value: '5' }, values)).toBe(false);
    expect(evaluateCondition({ fieldKey: 'flag', operator: 'equals', value: true }, values)).toBe(true);
    expect(evaluateCondition({ fieldKey: 'flag', operator: 'equals', value: 'true' }, values)).toBe(true);
  });
});

describe('flattenValues / computeVisibility', () => {
  it('flattens nested section data by key', () => {
    const flat = flattenValues(EXAMPLE_FORM.nodes, { businessType: 'other', address: { division: 'dhaka' }, payout: { method: 'bkash' } });
    expect(flat.businessType).toBe('other');
    expect(flat.division).toBe('dhaka');
    expect(flat.method).toBe('bkash');
    expect(flat.email).toBeUndefined();
  });

  it('hides conditional fields and respects nested rules', () => {
    const hidden = computeVisibility(EXAMPLE_FORM, { businessType: 'grocery', payout: { method: 'bank' } });
    expect(hidden.get('f_type_other')).toBe(false);
    expect(hidden.get('f_bkash')).toBe(false);
    expect(hidden.get('f_bank')).toBe(true);
    expect(hidden.get('f_business')).toBe(true);

    const shown = computeVisibility(EXAMPLE_FORM, { businessType: 'other', payout: { method: 'bkash' } });
    expect(shown.get('f_type_other')).toBe(true);
    expect(shown.get('f_bkash')).toBe(true);
    expect(shown.get('f_bank')).toBe(false);
  });

  it('propagates a hidden section to its children and treats hidden fields as empty', () => {
    const def = {
      ...EXAMPLE_FORM,
      nodes: [
        { id: 'toggle', type: 'checkbox' as const, key: 'more', label: 'More', required: false, validation: {}, options: [] },
        { id: 'sec', type: 'section' as const, key: 'extra', label: 'Extra', visibleWhen: { fieldKey: 'more', operator: 'equals' as const, value: true }, children: [{ id: 'inner', type: 'text' as const, key: 'note', label: 'Note', required: true, validation: {}, options: [] }] },
        { id: 'dep', type: 'text' as const, key: 'dep', label: 'Dep', required: false, validation: {}, options: [], visibleWhen: { fieldKey: 'note', operator: 'isNotEmpty' as const } },
      ],
    };
    const v = computeVisibility(def, { more: false, extra: { note: 'stale value' } });
    expect(v.get('sec')).toBe(false);
    expect(v.get('inner')).toBe(false);
    expect(v.get('dep')).toBe(false); // note is hidden, so it counts as empty
    const v2 = computeVisibility(def, { more: true, extra: { note: 'hello' } });
    expect(v2.get('inner')).toBe(true);
    expect(v2.get('dep')).toBe(true);
  });
});
