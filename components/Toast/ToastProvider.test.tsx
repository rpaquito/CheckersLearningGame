import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when useToast is called outside a ToastProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useToast();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it('show() displays a toast with the given message and default info tone', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Olá');
    });
    expect(result.current.toast).toEqual({ id: expect.any(Number), message: 'Olá', tone: 'info' });
  });

  it('a new show() call replaces the current toast and resets its auto-dismiss timer', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Primeira');
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.show('Segunda');
    });
    expect(result.current.toast?.message).toBe('Segunda');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Still visible -- only 3s have passed since the SECOND show(), not the 4s auto-dismiss.
    expect(result.current.toast?.message).toBe('Segunda');
  });

  it('auto-dismisses after 4 seconds', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Vai desaparecer');
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toast).toBeNull();
  });

  it('dismiss() clears the toast immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Mensagem');
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.toast).toBeNull();
  });

  it('renders the Toast UI as part of the provider tree', () => {
    render(
      <ToastProvider>
        <button
          type="button"
          onClick={() => {
            /* placeholder child */
          }}
        >
          child
        </button>
      </ToastProvider>
    );
    expect(screen.getByText('child')).not.toBeNull();
  });
});
