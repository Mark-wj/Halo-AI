import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_EMERGENCY = import.meta.env.VITE_EMAILJS_TEMPLATE_EMERGENCY;
const EMAILJS_TEMPLATE_LOCATION = import.meta.env.VITE_EMAILJS_TEMPLATE_LOCATION;
const EMAILJS_TEMPLATE_SAFE = import.meta.env.VITE_EMAILJS_TEMPLATE_SAFE;


if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
  console.log('EmailJS initialized with public key');
} else {
  console.warn('EmailJS public key not found in environment variables');
}

// Log configuration status
console.log('EmailJS Configuration:', {
  hasPublicKey: !!EMAILJS_PUBLIC_KEY,
  hasServiceId: !!EMAILJS_SERVICE_ID,
  hasTemplateId: !!EMAILJS_TEMPLATE_EMERGENCY,
  serviceId: EMAILJS_SERVICE_ID,
  templateId: EMAILJS_TEMPLATE_EMERGENCY
});


export const emailService = {
  /**
   * Send email to single recipient
   */
  async sendEmail(to, subject, message, templateParams = {}) {
    try {
      // EmailJS requires specific parameter names
      const params = {
        // CRITICAL: EmailJS needs these exact fields
        to_email: to,  // Recipient email
        to_name: templateParams.contact_name || 'Emergency Contact',
        from_name: 'HALO Guardian Network',
        reply_to: templateParams.reply_to || 'noreply@halo.network',
        
        // Message content
        subject: subject,
        message: message,
        
        // Emergency details
        victim_name: templateParams.victim_name || 'User',
        victim_email: templateParams.reply_to || '',
        contact_name: templateParams.contact_name || 'Emergency Contact',
        location_url: templateParams.location_url || '',
        location_text: templateParams.location_text || 'Location unavailable',
        timestamp: templateParams.timestamp || new Date().toLocaleString()
      };

      console.log('📧 Sending email to:', to);
      console.log('📧 Template params:', {
        to_email: params.to_email,
        template_id: EMAILJS_TEMPLATE_EMERGENCY,
        service_id: EMAILJS_SERVICE_ID
      });

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_EMERGENCY,
        params,
        EMAILJS_PUBLIC_KEY  
      );

      console.log('✅ Email sent successfully:', response);
      return { success: true, messageId: response.text };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      console.error('Error details:', {
        text: error.text,
        status: error.status,
        message: error.message
      });
      return { success: false, error: error.text || error.message };
    }
  },

  /**
   * Send emergency SOS email to multiple contacts
   */
  async sendEmergencyEmail(contacts, victimName, location, victimEmail = null) {
    const locationUrl = location 
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : 'Location unavailable';

    const locationText = location
      ? `Latitude: ${location.latitude.toFixed(6)}\nLongitude: ${location.longitude.toFixed(6)}\nAccuracy: ±${location.accuracy}m`
      : 'Location unavailable';

    const results = await Promise.all(
      contacts.map(contact => 
        this.sendEmail(
          contact.email,
          `🚨 EMERGENCY ALERT - ${victimName} Needs Help`,
          `EMERGENCY ALERT\n\n${victimName} needs help NOW!\n\nLocation: ${locationUrl}\n\n${locationText}\n\nIf you cannot reach them in 10 minutes, call police (999) immediately.\n\nThis is an automated message from HALO Guardian Network.`,
          {
            victim_name: victimName,
            victim_email: victimEmail || '',
            contact_name: contact.name,
            reply_to: victimEmail || 'noreply@halo.network',
            location_url: locationUrl,
            location_text: locationText,
            map_embed: `https://www.google.com/maps/embed/v1/place?key=YOUR_KEY&q=${location?.latitude},${location?.longitude}`,
            timestamp: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
          }
        )
      )
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
   * Send location update email
   */
  async sendLocationUpdate(contact, victimName, location) {
    const locationUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const timestamp = new Date(location.timestamp).toLocaleTimeString('en-KE', { 
      timeZone: 'Africa/Nairobi',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return await this.sendEmail(
      contact.email,
      `📍 Location Update - ${victimName}`,
      `Location Update - ${timestamp}\n\n${victimName}'s current location:\n${locationUrl}\n\nAccuracy: ±${location.accuracy}m\n\nHALO Guardian Network`,
      {
        victim_name: victimName,
        contact_name: contact.name,
        location_url: locationUrl,
        timestamp: timestamp,
        accuracy: location.accuracy
      }
    );
  },

  /**
   * Send "I'm safe" notification
   */
  async sendSafeNotification(contacts, victimName) {
    const results = await Promise.all(
      contacts.map(contact =>
        this.sendEmail(
          contact.email,
          `✅ SAFE CONFIRMATION - ${victimName}`,
          `SAFE CONFIRMATION\n\n${victimName} has confirmed they are now safe.\n\nThank you for being part of their guardian network.\n\nHALO Guardian Network`,
          {
            victim_name: victimName,
            contact_name: contact.name,
            timestamp: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
          }
        )
      )
    );

    return {
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }
};

export const emergencyAlertService = {
  /**
   * Send emergency alerts via email
   */
  async sendEmergencyAlert(contacts, victimName, location, victimEmail = null) {
    console.log('🚨 Sending emergency email alerts...', {
      contacts: contacts.length,
      victimName,
      victimEmail,
      location
    });

    const emailResults = await emailService.sendEmergencyEmail(contacts, victimName, location, victimEmail);

    return {
      success: emailResults.success,
      email: emailResults,
      totalContacts: contacts.length,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Send periodic location updates (every 2 minutes during active SOS)
   */
  async sendLocationUpdates(contacts, victimName, location) {
    const results = await Promise.all(
      contacts.map(contact => 
        emailService.sendLocationUpdate(contact, victimName, location)
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
    const results = await emailService.sendSafeNotification(contacts, victimName);

    return {
      success: true,
      email: results
    };
  }
};

export const mockAlertService = {
  async sendEmergencyAlert(contacts, victimName, location) {
    console.log('📧 MOCK EMAIL ALERT SENT:', {
      contacts: contacts.map(c => `${c.name} (${c.email})`),
      victimName,
      location
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      email: { successful: contacts.length, failed: 0, total: contacts.length },
      totalContacts: contacts.length,
      timestamp: new Date().toISOString(),
      mock: true
    };
  },

  async sendLocationUpdates(contacts, victimName, location) {
    console.log('📍 MOCK LOCATION EMAIL UPDATE:', { contacts: contacts.length, location });
    return { success: true, sent: contacts.length, failed: 0, mock: true };
  },

  async sendSafeNotification(contacts, victimName) {
    console.log('✅ MOCK SAFE EMAIL NOTIFICATION:', { contacts: contacts.length, victimName });
    return { success: true, email: { sent: contacts.length }, mock: true };
  }
};


export const formSubmitFallback = {
  async sendEmergencyEmail(contacts, victimName, location, victimEmail = null) {
    const locationUrl = location 
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : 'Location unavailable';

    const locationText = location
      ? `Latitude: ${location.latitude.toFixed(6)}, Longitude: ${location.longitude.toFixed(6)}, Accuracy: ±${location.accuracy}m`
      : 'Location unavailable';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="padding: 30px; background: #fff; border: 3px solid #dc2626;">
          <p style="font-size: 18px; color: #dc2626; font-weight: bold;">
            ${victimName} needs help NOW!
          </p>
          ${victimEmail ? `
          <div style="background: #eff6ff; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 14px;"><strong>Reply to this email</strong> to reach ${victimName} directly:</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #2563eb; font-weight: bold;">${victimEmail}</p>
          </div>
          ` : ''}
          <div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-weight: bold;">📍 LOCATION:</p>
            <p style="margin: 10px 0;">${locationText}</p>
            <a href="${locationUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View on Google Maps
            </a>
          </div>
          <div style="background: #fff7ed; padding: 20px; margin: 20px 0; border: 2px solid #ea580c; border-radius: 8px;">
            <p style="font-weight: bold; color: #9a3412;">⚠️ IMMEDIATE ACTIONS:</p>
            <ol>
              <li>Try to reach ${victimName} immediately${victimEmail ? ` at ${victimEmail}` : ''}</li>
              <li>If no response in 10 minutes, call police (999)</li>
              <li>Go to their location if safe to do so</li>
            </ol>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Time: ${new Date().toLocaleString()}<br>
            HALO Guardian Network - Emergency Alert System
          </p>
        </div>
      </div>
    `;

    const results = await Promise.all(
      contacts.map(async (contact) => {
        try {
          const formData = new FormData();
          formData.append('_subject', `🚨 EMERGENCY - ${victimName} Needs Help`);
          formData.append('_template', 'box');
          formData.append('_captcha', 'false');
          if (victimEmail) {
            formData.append('_replyto', victimEmail); 
          }
          formData.append('message', htmlContent);

          const response = await fetch(`https://formsubmit.co/${contact.email}`, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
          });

          if (response.ok) {
            console.log(`✅ Email sent to ${contact.email} via FormSubmit${victimEmail ? ` (reply-to: ${victimEmail})` : ''}`);
            return { success: true, email: contact.email };
          } else {
            console.error(`❌ Failed to send to ${contact.email}`);
            return { success: false, email: contact.email };
          }
        } catch (error) {
          console.error(`❌ Error sending to ${contact.email}:`, error);
          return { success: false, email: contact.email };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    return {
      success: successful > 0,
      successful,
      failed: contacts.length - successful,
      total: contacts.length,
      provider: 'FormSubmit',
      details: results
    };
  }
};


const isEmailJSConfigured = EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_EMERGENCY;

export const smartAlertService = {
  async sendEmergencyAlert(contacts, victimName, location, victimEmail = null) {
    console.log('🚨 Attempting to send emergency alerts...');

    // Try EmailJS first if configured
    if (isEmailJSConfigured) {
      try {
        console.log('📧 Trying EmailJS...');
        const emailJsResult = await emergencyAlertService.sendEmergencyAlert(contacts, victimName, location, victimEmail);
        
        if (emailJsResult.success && emailJsResult.email.successful > 0) {
          console.log('✅ EmailJS succeeded!');
          return { ...emailJsResult, provider: 'EmailJS' };
        }
        
        console.warn('⚠️ EmailJS failed, falling back to FormSubmit...');
      } catch (error) {
        console.warn('⚠️ EmailJS error, falling back to FormSubmit:', error);
      }
    } else {
      console.log('ℹ️ EmailJS not configured, using FormSubmit...');
    }

    // Fallback to FormSubmit (always works, no config needed)
    console.log('📧 Using FormSubmit (no signup required)...');
    return await formSubmitFallback.sendEmergencyEmail(contacts, victimName, location, victimEmail);
  },

  async sendLocationUpdates(contacts, victimName, location) {

    console.log('📍 Location update (mock mode)');
    return { success: true, sent: contacts.length, mock: true };
  },

  async sendSafeNotification(contacts, victimName) {
    // Use FormSubmit for safe notifications
    const results = await Promise.all(
      contacts.map(async (contact) => {
        try {
          const formData = new FormData();
          formData.append('_subject', `✅ SAFE - ${victimName} is Safe`);
          formData.append('_template', 'box');
          formData.append('_captcha', 'false');
          formData.append('message', `${victimName} has confirmed they are now safe. Thank you for being part of their guardian network.`);

          const response = await fetch(`https://formsubmit.co/${contact.email}`, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
          });

          return { success: response.ok };
        } catch (error) {
          return { success: false };
        }
      })
    );

    return {
      success: true,
      email: { sent: results.filter(r => r.success).length }
    };
  }
};

export const alertService = smartAlertService;

export default alertService;