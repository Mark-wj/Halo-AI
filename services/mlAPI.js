const API_BASE_URL = 'http://localhost:5000/api';
const EVIDENCE_BASE_URL = 'http://localhost:5000/api/evidence';

class MLAPIService {
  /**
   * Check if ML API is healthy
   */
  async checkHealth() {
    try {
      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { status: 'healthy', ...data };
      }
      
      return { status: 'unavailable' };
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Predict risk escalation
   */
  async predictEscalation(assessmentData) {
    try {
      const response = await fetch(`${API_BASE_URL}/predict-escalation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Prediction failed');
    } catch (error) {
      console.error('Escalation prediction error:', error);
      return {
        success: false,
        error: error.message,
        // Fallback prediction
        escalation_probability: this._fallbackEscalation(assessmentData),
        risk_level: this._fallbackRiskLevel(assessmentData)
      };
    }
  }

  /**
   * Get resource recommendations
   */
  async recommendResources(userProfile, resources) {
    try {
      const response = await fetch(`${API_BASE_URL}/recommend-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: userProfile, resources })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Recommendation failed');
    } catch (error) {
      console.error('Resource recommendation error:', error);
      return {
        success: false,
        error: error.message,
        recommendations: []
      };
    }
  }

  /**
   * Analyze trend over time
   */
  async analyzeTrend(assessmentHistory) {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-trend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessments: assessmentHistory })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Trend analysis failed');
    } catch (error) {
      console.error('Trend analysis error:', error);
      return {
        success: false,
        error: error.message,
        trend: 'UNKNOWN'
      };
    }
  }

  /**
   * Analyze journal entry
   */
  async analyzeJournal(text) {
    try {
      const response = await fetch(`${EVIDENCE_BASE_URL}/analyze-journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Journal analysis failed');
    } catch (error) {
      console.error('Journal analysis error:', error);
      return {
        success: false,
        error: error.message,
        // Fallback analysis
        sentiment: this._fallbackSentiment(text),
        crisis_detected: this._detectCrisisKeywords(text),
        distress_level: 5
      };
    }
  }

  /**
   * Analyze photo evidence
   */
  async analyzePhoto(photoMetadata) {
    try {
      const response = await fetch(`${EVIDENCE_BASE_URL}/analyze-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photoMetadata)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Photo analysis failed');
    } catch (error) {
      console.error('Photo analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze audio evidence
   */
  async analyzeAudio(audioMetadata) {
    try {
      const response = await fetch(`${EVIDENCE_BASE_URL}/analyze-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audioMetadata)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Audio analysis failed');
    } catch (error) {
      console.error('Audio analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze entire evidence collection
   */
  async analyzeEvidenceCollection(evidenceItems) {
    try {
      const response = await fetch(`${EVIDENCE_BASE_URL}/analyze-collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_items: evidenceItems })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return data;
      }
      
      throw new Error(data.error || 'Collection analysis failed');
    } catch (error) {
      console.error('Collection analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


  _fallbackEscalation(data) {
    // Simple rule-based fallback
    let score = 0;
    
    if (data.strangulation) score += 0.3;
    if (data.death_threats) score += 0.25;
    if (data.weapon_access) score += 0.2;
    if (data.escalating_violence) score += 0.15;
    if (data.children_harmed) score += 0.1;
    
    return Math.min(1.0, score);
  }

  _fallbackRiskLevel(data) {
    const prob = this._fallbackEscalation(data);
    
    if (prob >= 0.75) return 'CRITICAL';
    if (prob >= 0.5) return 'HIGH';
    if (prob >= 0.3) return 'MODERATE';
    return 'LOW';
  }

  _fallbackSentiment(text) {
    const textLower = text.toLowerCase();
    
    // Crisis keywords
    const crisis = ['kill', 'die', 'suicide', 'gun', 'weapon', 'strangle'];
    if (crisis.some(kw => textLower.includes(kw))) {
      return 'CRITICAL';
    }
    
    // High distress
    const highDistress = ['scared', 'afraid', 'terrified', 'fear', 'panic', 'hurt'];
    if (highDistress.filter(kw => textLower.includes(kw)).length >= 2) {
      return 'HIGH_DISTRESS';
    }
    
    // Moderate
    const moderate = ['worried', 'concerned', 'upset', 'angry'];
    if (moderate.some(kw => textLower.includes(kw))) {
      return 'MODERATE';
    }
    
    // Safe
    const safe = ['safe', 'better', 'healing', 'free', 'hope'];
    if (safe.some(kw => textLower.includes(kw))) {
      return 'SAFE';
    }
    
    return 'MODERATE';
  }

  _detectCrisisKeywords(text) {
    const crisisKeywords = [
      'kill', 'die', 'suicide', 'gun', 'weapon', 'knife',
      'strangle', 'choke', 'murder', 'death'
    ];
    
    const textLower = text.toLowerCase();
    return crisisKeywords.some(kw => textLower.includes(kw));
  }
}

// Export singleton instance
const mlAPI = new MLAPIService();
export default mlAPI;