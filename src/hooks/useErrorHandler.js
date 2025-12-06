import { toast } from 'sonner';
import * as Sentry from '@sentry/react';

export const useErrorHandler = () => {
  const handleError = (error, customMessage = 'An unexpected error occurred') => {
    console.error(error);
    Sentry.captureException(error);

    // Extract message from error object if available
    const message = error?.message || customMessage;

    toast.error(message);
  };

  return { handleError };
};
