import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ConversationHistory from './ConversationHistory';
import { renderWithProviders } from '../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockChatHistoryAPI } = vi.hoisted(() => ({
  mockChatHistoryAPI: {
    getSessions: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  chatHistoryAPI: mockChatHistoryAPI,
}));

describe('ConversationHistory page', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    Object.values(mockChatHistoryAPI).forEach((fn) => fn.mockReset());
  });

  it('loads and renders conversation sessions', async () => {
    mockChatHistoryAPI.getSessions.mockResolvedValue({
      data: {
        sessions: [
          {
            id: 1,
            scenario_type: 'free_conversation',
            started_at: '2026-03-20T10:00:00Z',
            ended_at: '2026-03-20T10:15:00Z',
            message_count: 8,
            overall_score: 7.5,
          },
        ],
        total: 1,
      },
    });

    renderWithProviders(<ConversationHistory />);

    expect(await screen.findByText('Free Conversation')).toBeTruthy();
    expect(screen.getByText('8 messages')).toBeTruthy();
  });

  it('shows empty state when no sessions exist', async () => {
    mockChatHistoryAPI.getSessions.mockResolvedValue({
      data: { sessions: [], total: 0 },
    });

    renderWithProviders(<ConversationHistory />);

    expect(await screen.findByText(/No conversations yet/i)).toBeTruthy();
  });
});
