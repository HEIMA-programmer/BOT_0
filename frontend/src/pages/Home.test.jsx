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

const { mockDailyLearningAPI, mockProgressAPI } = vi.hoisted(() => ({
  mockDailyLearningAPI: { getStats: vi.fn() },
  mockProgressAPI: { getDashboard: vi.fn() },
}));

vi.mock('../api', () => ({
  dailyLearningAPI: mockDailyLearningAPI,
  progressAPI: mockProgressAPI,
}));

describe('Home page', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockDailyLearningAPI.getStats.mockReset();
    mockProgressAPI.getDashboard.mockReset();
    mockProgressAPI.getDashboard.mockResolvedValue({
      data: { listening_done: 0, speaking_sessions: 0, total_time_minutes: 0 },
    });
  });

  it('renders welcome banner and loads stats', async () => {
    mockDailyLearningAPI.getStats.mockResolvedValue({
      data: { total_learned: 25, total_words: 570 },
    });

    renderWithProviders(<Home />);

    expect(await screen.findByText('Welcome back! Ready to practice?')).toBeTruthy();
    await waitFor(() => expect(mockDailyLearningAPI.getStats).toHaveBeenCalled());
    expect(await screen.findByText((content, el) => content.includes('25') && content.includes('570'))).toBeTruthy();
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
    expect(screen.getByText('Room')).toBeTruthy();

    fireEvent.click(screen.getByText('Vocabulary'));
    expect(mockNavigate).toHaveBeenCalledWith('/daily-words');
  });
});
