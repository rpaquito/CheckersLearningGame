import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';

const { isNativePlatformMock } = vi.hoisted(() => ({
  isNativePlatformMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: isNativePlatformMock },
}));

describe('ServiceWorkerRegistration — native guard', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReset();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({}),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  it('does not register the service worker inside the native Capacitor shell', () => {
    isNativePlatformMock.mockReturnValue(true);
    render(<ServiceWorkerRegistration />);
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it('still registers the service worker on the web', () => {
    isNativePlatformMock.mockReturnValue(false);
    render(<ServiceWorkerRegistration />);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });
});

describe('ServiceWorkerRegistration', () => {
  let registerMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let removeEventListenerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateMock = vi.fn().mockResolvedValue(undefined);
    registerMock = vi.fn().mockResolvedValue({ update: updateMock });
    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: registerMock,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      },
    });
  });

  it('registers the service worker on mount', () => {
    render(<ServiceWorkerRegistration />);
    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });

  it('does nothing when the browser has no serviceWorker support', () => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
    render(<ServiceWorkerRegistration />);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('reloads the page exactly once when a new service worker takes control', () => {
    render(<ServiceWorkerRegistration />);
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    const call = addEventListenerMock.mock.calls.find(([event]) => event === 'controllerchange');
    expect(call).toBeDefined();
    const handler = call![1] as () => void;
    handler();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    // A second firing must not reload again (guards against a repeat-fire loop).
    handler();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('checks for an update when the page becomes visible again', async () => {
    render(<ServiceWorkerRegistration />);
    await vi.waitFor(() => expect(registerMock).toHaveBeenCalled());
    // Let the registration promise resolve so the effect's `registration` closure is set.
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
  });

  it('removes both event listeners on unmount', () => {
    const { unmount } = render(<ServiceWorkerRegistration />);
    unmount();
    expect(removeEventListenerMock).toHaveBeenCalledWith('controllerchange', expect.any(Function));
  });
});
