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
        currentTranscript=""
        currentAiTranscript=""
        onEndConversation={vi.fn()}
      />
    );

    expect(screen.getByText(/connecting|setting up/i)).toBeTruthy();
  });

  it('renders message bubbles', () => {
    const messages = [
      { role: 'assistant', content: 'Hello! How can I help you today?' },
      { role: 'user', content: 'I need help with my essay.' },
    ];

    renderWithProviders(
      <ConversationView
        status="listening"
        aiSpeaking={false}
        messages={messages}
        currentTranscript=""
        currentAiTranscript=""
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
        currentTranscript=""
        currentAiTranscript=""
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
        messages={[{ role: 'assistant', content: 'Hi' }]}
        currentTranscript=""
        currentAiTranscript=""
        onEndConversation={vi.fn()}
        readOnly
      />
    );

    expect(screen.queryByRole('button', { name: /end conversation/i })).toBeNull();
  });
});
