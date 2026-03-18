import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Register from './Register';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockRegister, mockNavigate } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../api', () => ({
  authAPI: {
    register: (...args) => mockRegister(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Register page', () => {
  beforeEach(() => {
    mockRegister.mockReset();
    mockNavigate.mockReset();
  });

  it('submits normalized registration payload and logs user in', async () => {
    const onLogin = vi.fn();
    mockRegister.mockResolvedValue({
      data: { id: 1, username: 'newuser', email: 'new@example.com' },
    });

    renderWithProviders(<Register onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('Choose a username'), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'New@Example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });
    });
    expect(onLogin).toHaveBeenCalledWith({
      id: 1,
      username: 'newuser',
      email: 'new@example.com',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('blocks submission when passwords do not match', async () => {
    renderWithProviders(<Register onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Choose a username'), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Passwords do not match')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
