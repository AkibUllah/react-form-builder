import { describe, expect, it } from 'vitest';
import { buildZodSchema, defaultValues, stripHidden } from './zod';
import { EXAMPLE_FORM } from '@/app/example';

const schema = buildZodSchema(EXAMPLE_FORM);

const validData = {
  businessName: 'Rahim General Store',
  ownerName: 'Rahim Ahmed',
  phone: '01712345678',
  email: '',
  businessType: 'grocery',
  address: { division: 'dhaka', street: 'House 12, Road 5, Dhanmondi', postcode: '1209' },
  payout: { method: 'bkash', bkashNumber: '01812345678', bankAccount: '' },
  categories: ['food'],
  launchDate: '2026-04-01',
  acceptTerms: true,
};

function issuesOf(data: unknown): string[] {
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('buildZodSchema', () => {
  it('accepts valid data and coerces numbers', () => {
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.address as Record<string, unknown>).postcode).toBe(1209);
      expect(result.data.email).toBeUndefined();
    }
  });

  it('reports required fields, including nested ones, only when visible', () => {
    const issues = issuesOf({ ...validData, businessName: '', address: { ...validData.address, division: '' }, payout: { method: 'bkash', bkashNumber: '' } });
    expect(issues).toContain('businessName: This field is required');
    expect(issues).toContain('address.division: This field is required');
    expect(issues).toContain('payout.bkashNumber: This field is required');
    expect(issues.some((i) => i.startsWith('payout.bankAccount'))).toBe(false); // hidden
    expect(issues.some((i) => i.startsWith('businessTypeOther'))).toBe(false); // hidden
  });

  it('requires the conditional field once it becomes visible', () => {
    expect(issuesOf({ ...validData, businessType: 'other' })).toContain('businessTypeOther: This field is required');
    expect(issuesOf({ ...validData, businessType: 'other', businessTypeOther: 'Tailoring' })).toEqual([]);
  });

  it('enforces length, pattern, range, email, enum, array bounds, date and checkbox rules', () => {
    expect(issuesOf({ ...validData, businessName: 'ab' })).toContain('businessName: Must be at least 3 characters');
    expect(issuesOf({ ...validData, phone: '12345' })).toContain('phone: Enter an 11-digit number starting with 013-019');
    expect(issuesOf({ ...validData, email: 'nope' })).toContain('email: Enter a valid email address');
    expect(issuesOf({ ...validData, address: { ...validData.address, postcode: '99' } })).toContain('address.postcode: Must be at least 1000');
    expect(issuesOf({ ...validData, businessType: 'bakery' })).toContain('businessType: Choose one of the options');
    expect(issuesOf({ ...validData, categories: [] })).toContain('categories: Choose at least one option');
    expect(issuesOf({ ...validData, categories: ['food', 'fashion', 'home', 'electronics'] })).toContain('categories: Choose at most 3');
    expect(issuesOf({ ...validData, launchDate: '01/04/2026' })).toContain('launchDate: Enter a date as YYYY-MM-DD');
    expect(issuesOf({ ...validData, acceptTerms: false })).toContain('acceptTerms: This must be checked');
  });

  it('builds default values and strips hidden fields from the payload', () => {
    const defaults = defaultValues(EXAMPLE_FORM.nodes);
    expect(defaults).toMatchObject({ businessName: '', categories: [], acceptTerms: false, address: { division: '', street: '', postcode: '' } });
    const stripped = stripHidden(EXAMPLE_FORM, { ...validData, businessTypeOther: 'stale', payout: { method: 'bank', bkashNumber: '017', bankAccount: '12345678' } });
    expect(stripped).not.toHaveProperty('businessTypeOther');
    expect(stripped.payout).toEqual({ method: 'bank', bankAccount: '12345678' });
  });
});
