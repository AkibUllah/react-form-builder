import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useBuilderStore } from '@/lib';

describe('App (builder shell)', () => {
  it('adds a field from the palette, edits it in the property panel and exports it', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Drop a field here to start')).toBeInTheDocument();

    await user.dblClick(screen.getByRole('button', { name: 'Add Email' }));
    const canvas = screen.getByRole('region', { name: 'Form canvas' });
    expect(within(canvas).getByText('Email')).toBeInTheDocument();
    expect(useBuilderStore.getState().definition.nodes[0]?.type).toBe('email');

    const panel = screen.getByRole('complementary', { name: 'Properties' });
    const label = within(panel).getByLabelText('Label');
    await user.clear(label);
    await user.type(label, 'Work email');
    await user.click(within(panel).getByLabelText('Required'));
    expect(useBuilderStore.getState().definition.nodes[0]).toMatchObject({ label: 'Work email', required: true });

    await user.click(screen.getByRole('button', { name: 'Export' }));
    const json = screen.getByLabelText('Exported JSON') as HTMLTextAreaElement;
    const exported = JSON.parse(json.value) as { schema: { required: string[]; properties: Record<string, { format: string }> } };
    expect(exported.schema.required).toEqual(['email']);
    expect(exported.schema.properties.email?.format).toBe('email');
  });

  it('supports undo/redo and loading the example form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Example/ }));
    expect(useBuilderStore.getState().definition.nodes.length).toBeGreaterThan(5);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useBuilderStore.getState().definition.nodes).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(useBuilderStore.getState().definition.title).toBe('Merchant onboarding');
  });

  it('removes, duplicates and reorders nodes from the canvas controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.dblClick(screen.getByRole('button', { name: 'Add Text' }));
    await user.dblClick(screen.getByRole('button', { name: 'Add Number' }));
    const ids = () => useBuilderStore.getState().definition.nodes.map((n) => n.key);
    expect(ids()).toEqual(['text', 'number']);

    const numberNode = screen.getByTestId('node-number');
    await user.click(within(numberNode).getByRole('button', { name: 'Move up' }));
    expect(ids()).toEqual(['number', 'text']);
    await user.click(within(screen.getByTestId('node-text')).getByRole('button', { name: 'Duplicate' }));
    expect(ids()).toEqual(['number', 'text', 'text2']);
    await user.click(within(screen.getByTestId('node-text2')).getByRole('button', { name: 'Delete' }));
    expect(ids()).toEqual(['number', 'text']);
  });
});
