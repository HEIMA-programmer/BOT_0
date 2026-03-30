import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Forum from './Forum';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockForumAPI } = vi.hoisted(() => ({
  mockForumAPI: {
    getPosts: vi.fn(),
    getPost: vi.fn(),
    createPost: vi.fn(),
    deletePost: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
    forwardPost: vi.fn(),
    getMyPosts: vi.fn(),
    updatePost: vi.fn(),
    getPendingPosts: vi.fn(),
    reviewPost: vi.fn(),
    pinPost: vi.fn(),
    getRejectionReasons: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  forumAPI: mockForumAPI,
}));

const regularUser = { id: 1, username: 'testuser', is_admin: false };
const adminUser = { id: 2, username: 'admin', is_admin: true };

describe('Forum page', () => {
  beforeEach(() => {
    Object.values(mockForumAPI).forEach((fn) => fn.mockReset());
  });

  it('loads and renders approved posts for regular user', async () => {
    mockForumAPI.getPosts.mockResolvedValue({
      data: {
        posts: [
          {
            id: 1,
            user_id: 3,
            username: 'alice',
            tag: 'skills',
            title: 'Turnitin Guide',
            content: 'How to use Turnitin effectively...',
            status: 'approved',
            is_pinned: false,
            comment_count: 2,
            forward_count: 0,
            created_at: '2026-03-20T10:00:00Z',
            can_delete: false,
            can_edit: false,
            can_forward: true,
            can_pin: false,
            can_review: false,
          },
        ],
        total: 1,
        page: 1,
        pages: 1,
      },
    });

    renderWithProviders(<Forum user={regularUser} />);

    expect(await screen.findByText('Turnitin Guide')).toBeTruthy();
    expect(screen.getAllByText('Skills').length).toBeGreaterThanOrEqual(1);
  });

  it('shows admin review queue for admin user', async () => {
    mockForumAPI.getPosts.mockResolvedValue({
      data: { posts: [], total: 0, page: 1, pages: 0 },
    });
    mockForumAPI.getPendingPosts.mockResolvedValue({
      data: {
        posts: [
          {
            id: 10,
            user_id: 5,
            username: 'bob',
            tag: 'experience',
            title: 'My First Semester',
            content: 'Sharing my experience...',
            status: 'pending',
            is_pinned: false,
            comment_count: 0,
            forward_count: 0,
            created_at: '2026-03-20T12:00:00Z',
            can_delete: true,
            can_edit: false,
            can_forward: false,
            can_pin: false,
            can_review: true,
          },
        ],
        total: 1,
        page: 1,
        pages: 1,
      },
    });
    mockForumAPI.getRejectionReasons.mockResolvedValue({
      data: { reasons: ['Inaccurate information'] },
    });

    renderWithProviders(<Forum user={adminUser} />);

    expect(await screen.findByText('Admin Review Queue')).toBeTruthy();
    expect(await screen.findByText('My First Semester')).toBeTruthy();
  });

  it('switches between tag tabs', async () => {
    mockForumAPI.getPosts.mockResolvedValue({
      data: { posts: [], total: 0, page: 1, pages: 0 },
    });

    renderWithProviders(<Forum user={regularUser} />);

    await screen.findByText('All Posts');

    fireEvent.click(screen.getByText('Skills'));
    await waitFor(() =>
      expect(mockForumAPI.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'skills' })
      )
    );
  });
});
