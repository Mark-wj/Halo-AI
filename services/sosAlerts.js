// src/services/sosAlerts.js - UPDATED FOR EMAILJS

import { alertService } from './emailjs';
import { locationService } from './geolocation';
import { sosService } from './firebase';

/**
 * Complete SOS Alert System with Email Notifications
 */

export const sosAlertSystem = {
  /**
   * Trigger emergency SOS alert
   */
  async triggerEmergencySOS(emergencyContacts, victimName = 'User', victimEmail = null) {
    try {
      console.log('🚨 TRIGGERING EMERGENCY SOS...');
      
      // Step 1: Get current location
      const location = await locationService.getCurrentLocation();
      console.log('📍 Location obtained:', location);

      // Step 2: Create SOS alert in Firebase
      const alertResult = await sosService.createAlert('anonymous', {
        victimName,
        victimEmail,
        emergencyContacts,
        location,
        status: 'active',
        startTime: new Date().toISOString()
      });

      if (!alertResult.success) {
        throw new Error('Failed to create alert in database');
      }

      console.log('✅ Alert created in Firebase:', alertResult.alertId);

      // Step 3: Send Email alerts (with reply-to)
      const alertResults = await alertService.sendEmergencyAlert(
        emergencyContacts,
        victimName,
        location,
        victimEmail
      );

      console.log('📧 Email alerts sent:', alertResults);

      // Step 4: Start location tracking
      const watchId = locationService.startWatching(
        async (newLocation, error) => {
          if (error) {
            console.error('Location tracking error:', error);
            return;
          }

          console.log('📍 Location updated:', newLocation);

          // Update location in Firebase
          await sosService.startLocationTracking(alertResult.alertId, newLocation);

          // Send location updates to contacts (every 2 minutes to avoid spam)
          const timeSinceLastUpdate = Date.now() - (this.lastUpdateTime || 0);
          if (timeSinceLastUpdate > 120000) { // 2 minutes
            await alertService.sendLocationUpdates(
              emergencyContacts,
              victimName,
              newLocation
            );
            this.lastUpdateTime = Date.now();
          }
        },
        { enableHighAccuracy: true }
      );

      return {
        success: true,
        alertId: alertResult.alertId,
        watchId,
        alertResults,
        location
      };

    } catch (error) {
      console.error('❌ SOS Alert Error:', error);
      
      // Fallback: Show email addresses to contact manually
      return {
        success: false,
        error: error.message,
        fallbackMessage: 'Unable to send automated alerts. Please email your emergency contacts manually.',
        emergencyContacts
      };
    }
  },

  /**
   * Stop SOS alert
   */
  async stopSOS(alertId, watchId, emergencyContacts, victimName) {
    try {
      console.log('✅ Stopping SOS alert...');

      // Stop location tracking
      if (watchId) {
        locationService.stopWatching(watchId);
      }

      // Update alert status in Firebase
      if (alertId) {
        await sosService.updateAlertStatus(alertId, 'resolved');
      }

      // Send "I'm safe" notification via email
      await alertService.sendSafeNotification(emergencyContacts, victimName);

      return { success: true };
    } catch (error) {
      console.error('Error stopping SOS:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Generate email message for manual sending (fallback)
   */
  generateManualEmailMessage(victimName, location) {
    const locationUrl = location 
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : 'Location unavailable';

    const subject = `🚨 EMERGENCY: ${victimName} Needs Help`;
    const body = `EMERGENCY ALERT

${victimName} needs help NOW!

Location: ${locationUrl}

If you cannot reach them in 10 minutes, call police (999) immediately.

Sent from HALO Guardian Network`;

    return { subject, body };
  },

  /**
   * Test SOS system (for debugging)
   */
  async testSOSSystem(testContacts) {
    console.log('🧪 Testing SOS System...');
    
    const testResults = {
      locationAccess: false,
      firebaseConnection: false,
      emailjsConnection: false
    };

    // Test location access
    try {
      const location = await locationService.getCurrentLocation();
      testResults.locationAccess = location ? true : false;
      console.log('✅ Location access working');
    } catch (error) {
      console.error('❌ Location access failed:', error);
    }

    // Test Firebase connection
    try {
      const result = await sosService.createAlert('test', { test: true });
      testResults.firebaseConnection = result.success;
      console.log('✅ Firebase connection working');
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
    }

    // Test EmailJS (sends test email)
    if (testContacts && testContacts.length > 0) {
      try {
        const result = await alertService.sendEmergencyAlert(
          [testContacts[0]], // Send to first contact only
          'Test User',
          { latitude: -1.2921, longitude: 36.8219 } // Nairobi coordinates
        );
        testResults.emailjsConnection = result.success;
        console.log('✅ EmailJS connection working');
      } catch (error) {
        console.error('❌ EmailJS connection failed:', error);
      }
    }

    return testResults;
  }
};

export default sosAlertSystem;