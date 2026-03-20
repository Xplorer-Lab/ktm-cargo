import { useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * Safe Event Handler Hook
 * Wraps event handlers with automatic error handling
 */
export const useSafeEventHandler = () => {
  const { handleError } = useErrorHandler();

  const safeHandler = useCallback(
    (handler, errorMessage, context = {}) => {
      return async (...args) => {
        try {
          return await handler(...args);
        } catch (error) {
          handleError(error, errorMessage, {
            component: context.component || 'unknown',
            action: context.action || 'eventHandler',
            ...context,
          });
          throw error; // Re-throw for caller to handle if needed
        }
      };
    },
    [handleError]
  );

  return { safeHandler };
};
