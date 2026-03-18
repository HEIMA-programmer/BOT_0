import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Login from './Login';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockLogin, mockNavigate } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../api', () => ({
  authAPI: {
    login: (...args) => mockLogin(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { from: { pathname: '/daily-words' } } }),
  };
});

describe('Login page', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  it('submits normalized credentials and calls onLogin', async () => {
    const onLogin = vi.fn();
    mockLogin.mockResolvedValue({
      data: { id: 1, username: 'testuser', email: 'test@example.com' },
    });

    renderWithProviders(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'Test@Example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
    expect(onLogin).toHaveBeenCalledWith({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/daily-words', { replace: true });
  });

  it('shows validation errors when required fields are empty', async () => {
    renderWithProviders(<Login onLogin={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Please enter a valid email')).toBeTruthy();
    expect(await screen.findByText('Please enter your password')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
