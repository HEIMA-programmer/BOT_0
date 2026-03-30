import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AIChat from './AIChat';
import { renderWithProviders } from '../test/renderWithProviders';

vi.mock('../api', () => ({
  progressAPI: { trackTime: vi.fn() },
}));

describe('AIChat page', () => {
  it('renders scenario cards with coming-soon status', async () => {
    renderWithProviders(<AIChat />);

    expect(await screen.findByText('AI Conversation')).toBeTruthy();
    expect(screen.getByText('Office Hours')).toBeTruthy();
    expect(screen.getByText('Seminar Discussion')).toBeTruthy();
    expect(screen.getByText('Free Conversation')).toBeTruthy();

    const tags = screen.getAllByText('Coming soon');
    expect(tags.length).toBe(3);
  });
});
