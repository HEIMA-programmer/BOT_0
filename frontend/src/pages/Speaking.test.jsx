import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Speaking from './Speaking';
import { renderWithProviders } from '../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../api', () => ({
  progressAPI: { trackTime: vi.fn() },
}));

describe('Speaking page', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders speaking modes and navigates to structured speaking', async () => {
    renderWithProviders(<Speaking />);

    expect(await screen.findByText('Structured Speaking')).toBeTruthy();

    fireEvent.click(screen.getByText('Structured Speaking'));
    expect(mockNavigate).toHaveBeenCalledWith('/speaking/structured');
  });

  it('switches to AI Conversation tab and navigates to scenarios', async () => {
    renderWithProviders(<Speaking />);

    fireEvent.click(await screen.findByRole('tab', { name: /AI Conversation/i }));

    expect(await screen.findByText('Office Hours')).toBeTruthy();
    expect(screen.getByText('Free Conversation')).toBeTruthy();

    fireEvent.click(screen.getByText('Free Conversation'));
    expect(mockNavigate).toHaveBeenCalledWith('/speaking/free-conversation');
  });
});
