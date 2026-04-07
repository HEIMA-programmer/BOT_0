import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConversationView from './ConversationView';
import { renderWithProviders } from '../test/renderWithProviders';

describe('ConversationView', () => {
  it('shows connecting state', () => {
    renderWithProviders(
      <ConversationView
        status="connecting"
        aiSpeaking={false}
        messages={[]}
        onEndConversation={vi.fn()}
      />
    );

    expect(screen.getByText(/connecting|setting up/i)).toBeTruthy();
  });

  it('renders message bubbles', () => {
    const messages = [
      { id: 'test-1', role: 'assistant', content: 'Hello! How can I help you today?' },
      { id: 'test-2', role: 'user', content: 'I need help with my essay.' },
    ];

    renderWithProviders(
      <ConversationView
        status="listening"
        aiSpeaking={false}
        messages={messages}
        onEndConversation={vi.fn()}
      />
    );

    expect(screen.getByText('Hello! How can I help you today?')).toBeTruthy();
    expect(screen.getByText('I need help with my essay.')).toBeTruthy();
  });

  it('calls onEndConversation when end button is clicked', () => {
    const onEnd = vi.fn();

    renderWithProviders(
      <ConversationView
        status="listening"
        aiSpeaking={false}
        messages={[]}
        onEndConversation={onEnd}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end conversation/i }));
    expect(onEnd).toHaveBeenCalled();
  });

  it('hides end button in read-only mode', () => {
    renderWithProviders(
      <ConversationView
        status="listening"
        aiSpeaking={false}
        messages={[{ id: 'test-3', role: 'assistant', content: 'Hi' }]}
        onEndConversation={vi.fn()}
        readOnly
      />
    );

    expect(screen.queryByRole('button', { name: /end conversation/i })).toBeNull();
  });
});
