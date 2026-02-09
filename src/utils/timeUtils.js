/**
 * Time and date utilities
 */

export const timeUtils = {
  /**
   * Get current timestamp
   */
  now() {
    return new Date().toISOString();
  },

  /**
   * Add time to date
   */
  addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  },

  addHours(date, hours) {
    return new Date(date.getTime() + hours * 3600000);
  },

  addDays(date, days) {
    return new Date(date.getTime() + days * 86400000);
  },

  /**
   * Check if date is past
   */
  isPast(date) {
    return new Date(date) < new Date();
  },

  /**
   * Check if date is future
   */
  isFuture(date) {
    return new Date(date) > new Date();
  },

  /**
   * Get time difference in seconds
   */
  diffInSeconds(date1, date2) {
    return Math.floor((new Date(date1) - new Date(date2)) / 1000);
  },

  /**
   * Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};