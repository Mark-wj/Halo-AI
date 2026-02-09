const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;

// Base64 encode credentials for Basic Auth
const getAuthHeader = () => {
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  return `Basic ${credentials}`;
};


export const smsService = {
  /**
   * Send SMS to single recipient
   */
  async sendSMS(to, message) {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: TWILIO_PHONE_NUMBER,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'SMS sending failed');
      }

      const data = await response.json();
      return { success: true, sid: data.sid };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send emergency SOS SMS to multiple contacts
   */
  async sendEmergencySMS(contacts, victimName, location) {
    const locationUrl = location 
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : 'Location unavailable';

    const message = `🚨 EMERGENCY ALERT 🚨\n\n${victimName} needs help NOW!\n\nLocation: ${locationUrl}\n\nIf you cannot reach them in 10 minutes, call police immediately.\n\n- HALO Guardian Network`;

    const results = await Promise.all(
      contacts.map(contact => this.sendSMS(contact.phone, message))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: successful > 0,
      successful,
      failed,
      total: contacts.length,
      details: results
    };
  },

  /**
   * Send location update SMS
   */
  async sendLocationUpdate(to, victimName, location) {
    const locationUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const timestamp = new Date(location.timestamp).toLocaleTimeString();
    
    const message = `📍 Location Update - ${timestamp}\n\n${victimName}'s current location:\n${locationUrl}\n\nAccuracy: ±${location.accuracy}m\n\n- HALO Guardian Network`;

    return await this.sendSMS(to, message);
  },

  /**
   * Send "I'm safe" notification
   */
  async sendSafeNotification(contacts, victimName) {
    const message = `✅ SAFE CONFIRMATION\n\n${victimName} has confirmed they are now safe. Thank you for being part of their guardian network.\n\n- HALO Guardian Network`;

    const results = await Promise.all(
      contacts.map(contact => this.sendSMS(contact.phone, message))
    );

    return {
      success: true,
      sent: results.filter(r => r.success).length
    };
  }
};


export const whatsappService = {
  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to, message) {
    try {
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: whatsappTo,
            From: TWILIO_WHATSAPP_NUMBER,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'WhatsApp sending failed');
      }

      const data = await response.json();
      return { success: true, sid: data.sid };
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send emergency WhatsApp with location sharing
   */
  async sendEmergencyWhatsApp(contacts, victimName, location) {
    const locationUrl = location 
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : 'Location unavailable';

    const message = `🚨 *EMERGENCY ALERT* 🚨\n\n*${victimName}* needs help NOW!\n\n📍 *Location:*\n${locationUrl}\n\nIf you cannot reach them in 10 minutes, call police immediately.\n\n_Sent via HALO Guardian Network_`;

    const results = await Promise.all(
      contacts.map(contact => this.sendWhatsApp(contact.phone, message))
    );

    const successful = results.filter(r => r.success).length;
    
    return {
      success: successful > 0,
      successful,
      failed: contacts.length - successful,
      total: contacts.length
    };
  }
};



export const emergencyAlertService = {
  /**
   * Send emergency alerts via both SMS and WhatsApp
   */
  async sendEmergencyAlert(contacts, victimName, location) {
    console.log('🚨 Sending emergency alerts...', {
      contacts: contacts.length,
      victimName,
      location
    });

    // Send both SMS and WhatsApp simultaneously
    const [smsResults, whatsappResults] = await Promise.all([
      smsService.sendEmergencySMS(contacts, victimName, location),
      whatsappService.sendEmergencyWhatsApp(contacts, victimName, location)
    ]);

    return {
      success: smsResults.success || whatsappResults.success,
      sms: smsResults,
      whatsapp: whatsappResults,
      totalContacts: contacts.length,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Send periodic location updates (every 30 seconds during active SOS)
   */
  async sendLocationUpdates(contacts, victimName, location) {
    const results = await Promise.all(
      contacts.map(contact => 
        smsService.sendLocationUpdate(contact.phone, victimName, location)
      )
    );

    return {
      success: results.some(r => r.success),
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  },

  /**
   * Send "I'm safe" notification to all contacts
   */
  async sendSafeNotification(contacts, victimName) {
    const [smsResults, whatsappResults] = await Promise.all([
      smsService.sendSafeNotification(contacts, victimName),
      Promise.all(
        contacts.map(contact =>
          whatsappService.sendWhatsApp(
            contact.phone,
            `✅ *SAFE CONFIRMATION*\n\n${victimName} has confirmed they are now safe. Thank you for being part of their guardian network.\n\n_HALO Guardian Network_`
          )
        )
      )
    ]);

    return {
      success: true,
      sms: smsResults,
      whatsapp: { sent: whatsappResults.filter(r => r.success).length }
    };
  }
};


export const mockAlertService = {
  async sendEmergencyAlert(contacts, victimName, location) {
    console.log('📱 MOCK ALERT SENT:', {
      contacts: contacts.map(c => `${c.name} (${c.phone})`),
      victimName,
      location
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      sms: { successful: contacts.length, failed: 0, total: contacts.length },
      whatsapp: { successful: contacts.length, failed: 0, total: contacts.length },
      totalContacts: contacts.length,
      timestamp: new Date().toISOString(),
      mock: true
    };
  },

  async sendLocationUpdates(contacts, victimName, location) {
    console.log('📍 MOCK LOCATION UPDATE:', { contacts: contacts.length, location });
    return { success: true, sent: contacts.length, failed: 0, mock: true };
  },

  async sendSafeNotification(contacts, victimName) {
    console.log('✅ MOCK SAFE NOTIFICATION:', { contacts: contacts.length, victimName });
    return { success: true, sms: { sent: contacts.length }, whatsapp: { sent: contacts.length }, mock: true };
  }
};



// Use mock service if Twilio credentials are not configured
const isTwilioConfigured = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER;

export const alertService = isTwilioConfigured 
  ? emergencyAlertService 
  : mockAlertService;

export default alertService;