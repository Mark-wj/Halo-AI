/**
 * Error handling and logging utilities
 */

export const errorHandler = {
  /**
   * Log error
   */
  log(error, context = {}) {
    console.error('Error:', error);
    console.error('Context:', context);
    
    // In production, send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // TODO: Integrate error tracking
    }
  },

  /**
   * Get user-friendly error message
   */
  getUserMessage(error) {
    const messages = {
      'permission-denied': 'You do not have permission to perform this action.',
      'not-found': 'The requested resource was not found.',
      'already-exists': 'This resource already exists.',
      'network-error': 'Network error. Please check your internet connection.',
      'timeout': 'Request timed out. Please try again.',
      'unknown': 'An unexpected error occurred. Please try again.'
    };

    const errorCode = error.code || 'unknown';
    return messages[errorCode] || error.message || messages.unknown;
  },

  /**
   * Handle Firebase errors
   */
  handleFirebaseError(error) {
    const userMessage = this.getUserMessage(error);
    this.log(error, { type: 'firebase' });
    return userMessage;
  },

  /**
   * Handle network errors
   */
  handleNetworkError(error) {
    this.log(error, { type: 'network' });
    return 'Network error. Please check your internet connection and try again.';
  }
};