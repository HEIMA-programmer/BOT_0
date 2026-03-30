import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import VoiceSelector from './VoiceSelector';
import { renderWithProviders } from '../test/renderWithProviders';

describe('VoiceSelector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders voice options', () => {
    renderWithProviders(
      <VoiceSelector value="Puck" onChange={vi.fn()} />
    );

    expect(screen.getByText('Choose AI Voice')).toBeTruthy();
    expect(screen.getByText('Puck')).toBeTruthy();
  });

  it('calls onChange when a voice is selected', () => {
    const onChange = vi.fn();

    renderWithProviders(
      <VoiceSelector value="Puck" onChange={onChange} />
    );

    fireEvent.click(screen.getByText('Kore'));
    expect(onChange).toHaveBeenCalledWith('Kore');
  });
});
