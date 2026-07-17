export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Marks the confirm action as destructive (red on iOS). */
  destructive?: boolean;
}

/**
 * User-facing feedback, implemented per platform (notify.ts native,
 * notify.web.ts web — Metro resolves the right one). Stores and hooks call
 * this instead of Alert/Platform so they stay platform-free.
 */
export interface Notify {
  error(title: string, message?: string): void;
  success(message: string): void;
  confirm(options: ConfirmOptions): Promise<boolean>;
}
