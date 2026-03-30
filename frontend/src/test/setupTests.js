import { vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: vi.fn(() => ({
    getPropertyValue: vi.fn(() => ''),
    overflow: 'auto',
    overflowX: 'auto',
    overflowY: 'auto',
  })),
});

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    speak: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: function SpeechSynthesisUtterance(text) {
    this.text = text;
  },
});

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn(),
  },
});

Object.defineProperty(globalThis, 'fetch', {
  writable: true,
  value: vi.fn((input) => {
    const url = String(input);

    if (url.includes('/AWL/AWL.csv')) {
      return Promise.resolve({
        ok: true,
        text: async () => [
          'hypothesis,A proposed explanation.',
          'empirical,Based on observation.',
          'analysis,A detailed investigation of the parts of something',
        ].join('\n'),
      });
    }

    if (url.includes('/AWL/AWL_example_sentences.txt')) {
      return Promise.resolve({
        ok: true,
        text: async () => [
          'The hypothesis was supported by classroom evidence.',
          'The empirical study relied on direct observation.',
          'The analysis revealed a clear pattern in the results.',
        ].join('\n'),
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      text: async () => '',
    });
  }),
});

if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
  let store = {};
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    },
  });
}
