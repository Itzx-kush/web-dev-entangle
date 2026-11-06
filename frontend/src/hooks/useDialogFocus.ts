import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([aria-hidden="true"])',
  'a[href]:not([aria-hidden="true"])',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
].join(',');

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export type UseDialogFocusOptions = {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  lockBodyScroll?: boolean;
  onKeyDown?: (event: KeyboardEvent) => void;
};

/**
 * Shared dialog accessibility hook that manages initial focus, Tab/Shift+Tab focus trapping,
 * Escape-to-close, body scroll locking, and focus restoration to the triggering element.
 */
export function useDialogFocus({
  open,
  onClose,
  containerRef,
  initialFocusRef,
  restoreFocusRef,
  lockBodyScroll = true,
  onKeyDown,
}: UseDialogFocusOptions) {
  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      restoreFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const previousOverflow = document.body.style.overflow;
    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    const focusInitialTarget = () => {
      const explicitTarget = initialFocusRef?.current;
      if (explicitTarget && !explicitTarget.hasAttribute('disabled')) {
        explicitTarget.focus();
        return;
      }
      const focusables = getFocusableElements(containerRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        containerRef.current?.focus();
      }
    };

    focusInitialTarget();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const container = containerRef.current;
        const focusables = getFocusableElements(container);
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const insideDialog = Boolean(container && active && container.contains(active));

        if (event.shiftKey) {
          if (!insideDialog || active === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (!insideDialog || active === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      onKeyDown?.(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow;
      }
      const returnTarget = restoreFocusRef?.current ?? previouslyFocused;
      if (returnTarget && document.contains(returnTarget)) {
        returnTarget.focus();
      }
    };
  }, [open, onClose, containerRef, initialFocusRef, restoreFocusRef, lockBodyScroll, onKeyDown]);
}
