import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormRenderer } from './FormRenderer';
import { EXAMPLE_FORM } from '@/app/example';

describe('FormRenderer', () => {
  it('renders fields, sections and marks required ones', () => {
    render(<FormRenderer definition={EXAMPLE_FORM} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Merchant onboarding' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Business name/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Shop address' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Division/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Describe your business/)).not.toBeInTheDocument();
  });

  it('shows validation errors and blocks submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormRenderer definition={EXAMPLE_FORM} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/Mobile number/), '12345');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getByText('Enter an 11-digit number starting with 013-019')).toBeInTheDocument();
    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reveals conditional fields live and submits a clean payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormRenderer definition={EXAMPLE_FORM} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Business name/), 'Rahim General Store');
    await user.type(screen.getByLabelText(/Owner name/), 'Rahim Ahmed');
    await user.type(screen.getByLabelText(/Mobile number/), '01712345678');
    await user.selectOptions(screen.getByLabelText(/Business type/), 'other');
    const other = await screen.findByLabelText(/Describe your business/);
    await user.type(other, 'Tailoring');
    await user.click(screen.getByRole('radio', { name: 'Dhaka' }));
    await user.type(screen.getByLabelText(/Street address/), 'House 12, Dhanmondi');
    await user.click(screen.getByRole('radio', { name: 'bKash' }));
    await user.type(await screen.findByLabelText(/bKash wallet number/), '01812345678');
    expect(screen.queryByLabelText(/Bank account number/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Food' }));
    await user.click(screen.getByRole('checkbox', { name: /I accept the merchant agreement/ }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      businessName: 'Rahim General Store',
      businessType: 'other',
      businessTypeOther: 'Tailoring',
      address: { division: 'dhaka', street: 'House 12, Dhanmondi' },
      payout: { method: 'bkash', bkashNumber: '01812345678' },
      categories: ['food'],
      acceptTerms: true,
    });
    expect(payload.payout).not.toHaveProperty('bankAccount');
    expect(payload).not.toHaveProperty('email');
  });
});
