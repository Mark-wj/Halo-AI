/**
 * Input validation utilities
 */

export const validators = {
  /**
   * Validate phone number (Kenya format)
   */
  validatePhone(phone) {
    // Accept formats: +254722000000, 0722000000, 254722000000
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const patterns = [
      /^\+254[17]\d{8}$/,  // +254722000000
      /^254[17]\d{8}$/,    // 254722000000
      /^0[17]\d{8}$/       // 0722000000
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  },

  /**
   * Format phone number to international format
   */
  formatPhone(phone) {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('254')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+254${cleaned.substring(1)}`;
    
    return phone;
  },

  /**
   * Validate email
   */
  validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },

  /**
   * Validate PIN (4-6 digits)
   */
  validatePIN(pin) {
    return /^\d{4,6}$/.test(pin);
  },

  /**
   * Validate coordinates
   */
  validateCoordinates(lat, lon) {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    );
  },

  /**
   * Sanitize input (prevent XSS)
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
};