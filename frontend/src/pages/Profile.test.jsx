import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Profile from './Profile';

const { mockProgressAPI } = vi.hoisted(() => ({
  mockProgressAPI: {
    getDashboard: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  progressAPI: mockProgressAPI,
}));

describe('Profile page', () => {
  beforeEach(() => {
    mockProgressAPI.getDashboard.mockReset();
    mockProgressAPI.getDashboard.mockResolvedValue({
      data: {
        words_learned: 12,
        listening_done: 4,
        speaking_sessions: 3,
        total_time_minutes: 90,
      },
    });
  });

  it('loads and displays live progress stats', async () => {
    render(
      <AntdApp>
        <Profile
          user={{ username: 'tester', email: 'tester@example.com', created_at: '2026-03-01T00:00:00Z' }}
        />
      </AntdApp>
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
