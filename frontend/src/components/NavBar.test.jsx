import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import NavBar from './NavBar';
import { renderWithProviders } from '../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('NavBar', () => {
  const user = { id: 1, username: 'testuser' };
  const onLogout = vi.fn();

  beforeEach(() => {
    mockNavigate.mockReset();
    onLogout.mockReset();
  });

  it('renders logo, menu items, and user avatar', async () => {
    renderWithProviders(<NavBar user={user} onLogout={onLogout} />);

    expect(await screen.findByText('Academic English')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Listening')).toBeTruthy();
    expect(screen.getByText('Speaking')).toBeTruthy();
    expect(screen.getByText('Vocabulary')).toBeTruthy();
    expect(screen.getByText('Forum')).toBeTruthy();
  });
});
