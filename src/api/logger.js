/**
 * Logger Service
 * Centralized logging for tracking errors and events.
 * Simulates a service like Sentry or LogRocket.
 */

// In a real app, this would be your Sentry/LogRocket DSN
// true in development/test; false in production builds
const LOGGING_ENABLED = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log an error
   * @param {Error} error The error object
   * @param {Object} errorInfo Additional context
   */
  logError: (error, errorInfo = {}) => {
    if (!LOGGING_ENABLED) return;

    // 1. Log to console for local debugging
    console.error('[Logger] Caught error:', error);
    if (Object.keys(errorInfo).length > 0) {
      console.error('[Logger] Context:', errorInfo);
    }

    // 2. Simulate sending to external service (Sentry, etc.)
    // In real implementation: Sentry.captureException(error, { extra: errorInfo });
    console.log('[Logger] 🚀 Reported to monitoring service', {
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...errorInfo,
    });
  },

  /**
   * Log a specific user action or event
   * @param {string} eventName Name of the event
   * @param {Object} data Data associated with the event
   */
  logEvent: (eventName, data = {}) => {
    if (!LOGGING_ENABLED) return;

    console.log(`[Logger] 📊 Event: ${eventName}`, data);
    // In real implementation: Analytics.track(eventName, data);
  },
};
