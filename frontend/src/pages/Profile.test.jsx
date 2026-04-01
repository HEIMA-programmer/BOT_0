import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Profile from './Profile';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockProgressAPI, mockForumAPI, mockAuthAPI } = vi.hoisted(() => ({
  mockProgressAPI: {
    getDashboard: vi.fn(),
  },
  mockForumAPI: {
    getMyPosts: vi.fn(),
  },
  mockAuthAPI: {
    updateUsername: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  progressAPI: mockProgressAPI,
  forumAPI: mockForumAPI,
  authAPI: mockAuthAPI,
}));

describe('Profile page', () => {
  beforeEach(() => {
    mockProgressAPI.getDashboard.mockReset();
    mockForumAPI.getMyPosts.mockReset();
    mockProgressAPI.getDashboard.mockResolvedValue({
      data: {
        words_learned: 12,
        listening_done: 4,
        speaking_sessions: 3,
        total_time_minutes: 90,
      },
    });
    mockForumAPI.getMyPosts.mockResolvedValue({
      data: { items: [], total: 0 },
    });
  });

  it('loads and displays live progress stats', async () => {
    renderWithProviders(
      <Profile
        user={{ username: 'tester', email: 'tester@example.com', created_at: '2026-03-01T00:00:00Z' }}
        onUserUpdate={() => {}}
      />
    );

    await waitFor(() => {
      expect(mockProgressAPI.getDashboard).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('12')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1.5h')).toBeTruthy();
  });
});
