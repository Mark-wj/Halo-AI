import offlineService from './offlineService';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${BASE}/api`;
const EVIDENCE_BASE_URL = `${BASE}/api/evidence`;

class MLAPIService {
  async checkHealth() {
    try {
      const response = await fetch(`${BASE}/health`, {
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

  async predictEscalation(assessmentData) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${API_BASE_URL}/predict-escalation`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assessmentData) },
        null
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Prediction failed');
    } catch (error) {
      console.error('Escalation prediction error:', error);
      return { success: false, error: error.message, escalation_probability: this._fallbackEscalation(assessmentData), risk_level: this._fallbackRiskLevel(assessmentData) };
    }
  }

  async recommendResources(userProfile, resources) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${API_BASE_URL}/recommend-resources`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: userProfile, resources }) },
        'halo_cache_recommendations'
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Recommendation failed');
    } catch (error) {
      console.error('Resource recommendation error:', error);
      return { success: false, error: error.message, recommendations: [] };
    }
  }

  async analyzeTrend(assessmentHistory) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${API_BASE_URL}/analyze-trend`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessments: assessmentHistory }) },
        null
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Trend analysis failed');
    } catch (error) {
      console.error('Trend analysis error:', error);
      return { success: false, error: error.message, trend: 'UNKNOWN' };
    }
  }

  async analyzeJournal(text) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${EVIDENCE_BASE_URL}/analyze-journal`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) },
        null
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Journal analysis failed');
    } catch (error) {
      console.error('Journal analysis error:', error);
      return {
        success: true, fromCache: true,
        sentiment: this._fallbackSentiment(text),
        crisis_detected: this._detectCrisisKeywords(text),
        distress_level: this._detectCrisisKeywords(text) ? 8 : 5,
        confidence: 0.6,
        recommended_actions: [
          'Reach out to a trusted person',
          'Contact GBV Hotline: 1195 (free, 24/7)',
          'Consider activating Emergency SOS if in immediate danger'
        ]
      };
    }
  }

  async analyzePhoto(photoMetadata) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${EVIDENCE_BASE_URL}/analyze-photo`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(photoMetadata) },
        null
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Photo analysis failed');
    } catch (error) {
      console.error('Photo analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeAudio(audioMetadata) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${EVIDENCE_BASE_URL}/analyze-audio`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(audioMetadata) },
        null
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Audio analysis failed');
    } catch (error) {
      console.error('Audio analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeEvidenceCollection(evidenceItems) {
    try {
      const { data } = await offlineService.fetchWithFallback(
        `${EVIDENCE_BASE_URL}/analyze-collection`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_items: evidenceItems }) },
        null
      );
      if (data.success !== false) return data;
      throw new Error(data.error || 'Collection analysis failed');
    } catch (error) {
      console.error('Collection analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  _fallbackEscalation(data) {
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
    const t = text.toLowerCase();
    if (['kill', 'die', 'suicide', 'gun', 'weapon', 'strangle'].some(kw => t.includes(kw))) return 'CRITICAL';
    if (['scared', 'afraid', 'terrified', 'fear', 'panic', 'hurt'].filter(kw => t.includes(kw)).length >= 2) return 'HIGH_DISTRESS';
    if (['worried', 'concerned', 'upset', 'angry'].some(kw => t.includes(kw))) return 'MODERATE';
    if (['safe', 'better', 'healing', 'free', 'hope'].some(kw => t.includes(kw))) return 'SAFE';
    return 'MODERATE';
  }

  _detectCrisisKeywords(text) {
    const keywords = ['kill', 'die', 'suicide', 'gun', 'weapon', 'knife', 'strangle', 'choke', 'murder', 'death'];
    return keywords.some(kw => text.toLowerCase().includes(kw));
  }
}

const mlAPI = new MLAPIService();
export default mlAPI;