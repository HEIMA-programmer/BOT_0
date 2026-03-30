import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Home from './Home';
import { renderWithProviders } from '../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockDailyLearningAPI } = vi.hoisted(() => ({
  mockDailyLearningAPI: { getStats: vi.fn() },
}));

vi.mock('../api', () => ({
  dailyLearningAPI: mockDailyLearningAPI,
}));

describe('Home page', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockDailyLearningAPI.getStats.mockReset();
  });

  it('renders welcome banner and loads stats', async () => {
    mockDailyLearningAPI.getStats.mockResolvedValue({
      data: { total_learned: 25, total_words: 570 },
    });

    renderWithProviders(<Home />);

    expect(await screen.findByText('Welcome back! Ready to practice?')).toBeTruthy();
    await waitFor(() => expect(mockDailyLearningAPI.getStats).toHaveBeenCalled());
    expect(await screen.findByText('25 / 570')).toBeTruthy();
  });

  it('renders all five module cards and navigates on click', async () => {
    mockDailyLearningAPI.getStats.mockResolvedValue({
      data: { total_learned: 0, total_words: 0 },
    });

    renderWithProviders(<Home />);

    expect(await screen.findByText('Listening Lab')).toBeTruthy();
    expect(screen.getByText('Speaking Studio')).toBeTruthy();
    expect(screen.getByText('Vocabulary')).toBeTruthy();
    expect(screen.getByText('Forum')).toBeTruthy();
    expect(screen.getByText('AI Conversation')).toBeTruthy();

    fireEvent.click(screen.getByText('Vocabulary'));
    expect(mockNavigate).toHaveBeenCalledWith('/daily-words');
  });
});
