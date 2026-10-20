import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useBuilderStore } from '@/lib';
import { createEmptyDefinition } from '@/lib';

afterEach(() => {
  cleanup();
  localStorage.clear();
  useBuilderStore.setState({ definition: createEmptyDefinition(), selectedId: null, past: [], future: [] });
});
