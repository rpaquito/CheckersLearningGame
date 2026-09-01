import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function TestModal({ open }: { open: boolean }) {
  const panelRef = useFocusTrap(open);
  if (!open) return null;
  return (
    <div ref={panelRef} tabIndex={-1} data-testid="panel">
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus to the panel itself when it opens', () => {
    const { getByTestId } = render(<TestModal open={true} />);
    expect(document.activeElement).toBe(getByTestId('panel'));
  });

  it('cycles Tab from the last focusable element back to the first', () => {
    const { getByText } = render(<TestModal open={true} />);
    const first = getByText('First');
    const last = getByText('Last');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('cycles Shift+Tab from the first focusable element to the last', () => {
    const { getByText } = render(<TestModal open={true} />);
    const first = getByText('First');
    const last = getByText('Last');
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to the previously-focused element when it closes', () => {
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    const { rerender } = render(<TestModal open={false} />);
    rerender(<TestModal open={true} />);
    rerender(<TestModal open={false} />);

    expect(document.activeElement).toBe(outsideButton);
    document.body.removeChild(outsideButton);
  });
});
