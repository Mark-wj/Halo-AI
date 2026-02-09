export const formSubmitService = {
  /**
   * Send email via FormSubmit
   */
  async sendEmail(to, subject, message, htmlContent = null) {
    try {
      const formData = new FormData();
      formData.append('_subject', subject);
      formData.append('_template', 'box'); 
      formData.append('_captcha', 'false'); 
      
      // Add content
      if (htmlContent) {
        formData.append('message', htmlContent);
      } else {
        formData.append('message', message);
      }

      const response = await fetch(`https://formsubmit.co/${to}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Email sent via FormSubmit');
        return { success: true, service: 'FormSubmit' };
      } else {
        const error = await response.text();
        console.error('FormSubmit error:', error);
        return { success: false, error };
      }
    } catch (error) {
      console.error('Error sending via FormSubmit:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send emergency alert email
   */
  async sendEmergencyEmail(contacts, victimName, location) {
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
              <li>Try to reach ${victimName} immediately</li>
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
      contacts.map(contact => 
        this.sendEmail(
          contact.email,
          `🚨 EMERGENCY - ${victimName} Needs Help`,
          `EMERGENCY: ${victimName} needs help NOW! Location: ${locationUrl}`,
          htmlContent
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
   * Send location update
   */
  async sendLocationUpdate(contact, victimName, location) {
    const locationUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const timestamp = new Date(location.timestamp).toLocaleTimeString();
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">📍 Location Update</h2>
        </div>
        <div style="padding: 20px; background: #fff; border: 2px solid #2563eb;">
          <p><strong>${victimName}'s</strong> location at ${timestamp}:</p>
          <p style="background: #eff6ff; padding: 15px; border-radius: 6px;">
            Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}<br>
            Accuracy: ±${location.accuracy}m
          </p>
          <a href="${locationUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View on Map
          </a>
        </div>
      </div>
    `;

    return await this.sendEmail(
      contact.email,
      `📍 Location Update - ${victimName}`,
      `${victimName}'s location: ${locationUrl}`,
      htmlContent
    );
  },

  /**
   * Send safe notification
   */
  async sendSafeNotification(contacts, victimName) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">✅ SAFE CONFIRMATION</h1>
        </div>
        <div style="padding: 30px; background: #fff; border: 2px solid #059669;">
          <p style="font-size: 16px;">
            <strong>${victimName}</strong> has confirmed they are now safe.
          </p>
          <p style="background: #d1fae5; padding: 15px; border-radius: 6px; color: #065f46;">
            Thank you for being part of their guardian network.
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
            Time: ${new Date().toLocaleString()}<br>
            HALO Guardian Network
          </p>
        </div>
      </div>
    `;

    const results = await Promise.all(
      contacts.map(contact =>
        this.sendEmail(
          contact.email,
          `✅ SAFE - ${victimName} is Safe`,
          `${victimName} is now safe.`,
          htmlContent
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


export const multiProviderEmailService = {
  /**
   * Try EmailJS first, fallback to FormSubmit
   */
  async sendEmergencyAlert(contacts, victimName, location, emailJsService) {
    console.log('🚨 Sending emergency alerts via multiple providers...');

    // Try EmailJS first (if configured)
    let emailJsResults = null;
    if (emailJsService && typeof emailJsService.sendEmergencyEmail === 'function') {
      try {
        console.log('📧 Trying EmailJS...');
        emailJsResults = await emailJsService.sendEmergencyEmail(contacts, victimName, location);
        
        if (emailJsResults.success && emailJsResults.successful > 0) {
          console.log('✅ EmailJS succeeded');
          return emailJsResults;
        }
      } catch (error) {
        console.warn('⚠️ EmailJS failed, trying FormSubmit...', error);
      }
    }

    // Fallback to FormSubmit
    console.log('📧 Using FormSubmit as fallback...');
    const formSubmitResults = await formSubmitService.sendEmergencyEmail(contacts, victimName, location);
    
    return {
      ...formSubmitResults,
      provider: 'FormSubmit',
      emailJsFailed: emailJsResults ? true : false
    };
  },

  async sendLocationUpdates(contacts, victimName, location) {
    const results = await Promise.all(
      contacts.map(contact => 
        formSubmitService.sendLocationUpdate(contact, victimName, location)
      )
    );

    return {
      success: results.some(r => r.success),
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  },

  async sendSafeNotification(contacts, victimName) {
    return await formSubmitService.sendSafeNotification(contacts, victimName);
  }
};

export default formSubmitService;