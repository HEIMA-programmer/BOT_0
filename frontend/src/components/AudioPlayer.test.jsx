import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AudioPlayer from './AudioPlayer';

describe('AudioPlayer', () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('toggles play state even when mocked media methods do not emit browser events', async () => {
    render(
      <AntdApp>
        <AudioPlayer src="/api/listening/audio/sample" title="Sample Clip" />
      </AntdApp>
    );

    const button = screen.getByRole('button');
    const playMock = window.HTMLMediaElement.prototype.play;
    const pauseMock = window.HTMLMediaElement.prototype.pause;

    playMock.mockClear();
    pauseMock.mockClear();

    fireEvent.click(button);

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    fireEvent.click(button);

    expect(pauseMock).toHaveBeenCalledTimes(1);
  });
});
