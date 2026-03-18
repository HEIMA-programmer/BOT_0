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
    speak: vi.fn(),
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
