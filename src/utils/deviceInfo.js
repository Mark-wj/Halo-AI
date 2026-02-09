/**
 * Device and browser information utilities
 */

export const deviceInfo = {
  /**
   * Get device type
   */
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  },

  /**
   * Get browser name
   */
  getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  },

  /**
   * Get OS
   */
  getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  },

  /**
   * Check if mobile device
   */
  isMobile() {
    return this.getDeviceType() === 'mobile';
  },

  /**
   * Check if iOS
   */
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  /**
   * Check if Android
   */
  isAndroid() {
    return /Android/.test(navigator.userAgent);
  },

  /**
   * Get device info object
   */
  getDeviceInfo() {
    return {
      type: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled
    };
  }
};