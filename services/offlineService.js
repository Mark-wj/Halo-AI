/**
 * HALO Offline Service
 * Caches critical data to localStorage so the app works without internet.
 * Queues actions taken offline and syncs when connection returns.
 */

const OFFLINE_KEYS = {
  RESOURCES: 'halo_offline_resources',
  CONTACTS: 'halo_offline_contacts',
  RISK_CONFIG: 'halo_offline_risk_config',
  CHATBOT_CONFIG: 'halo_offline_chatbot',
  QUEUE: 'halo_offline_queue',
  LAST_SYNC: 'halo_offline_last_sync',
};

class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this._listeners = [];

    window.addEventListener('online', () => {
      this.isOnline = true;
      this._notify('online');
      this._syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this._notify('offline');
    });
  }

  /** Cache emergency contacts locally */
  cacheContacts(contacts) {
    localStorage.setItem(OFFLINE_KEYS.CONTACTS, JSON.stringify(contacts));
  }

  getCachedContacts() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEYS.CONTACTS)) || [];
    } catch { return []; }
  }

  /** Cache resources for offline browsing */
  cacheResources(resources) {
    localStorage.setItem(OFFLINE_KEYS.RESOURCES, JSON.stringify(resources));
    localStorage.setItem(OFFLINE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  getCachedResources() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEYS.RESOURCES)) || [];
    } catch { return []; }
  }

  /** Cache ML config for offline risk assessment */
  cacheRiskConfig(config) {
    localStorage.setItem(OFFLINE_KEYS.RISK_CONFIG, JSON.stringify(config));
  }

  getCachedRiskConfig() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEYS.RISK_CONFIG));
    } catch { return null; }
  }

  /** Cache chatbot questions for offline use */
  cacheChatbotConfig(config) {
    localStorage.setItem(OFFLINE_KEYS.CHATBOT_CONFIG, JSON.stringify(config));
  }

  getCachedChatbotConfig() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEYS.CHATBOT_CONFIG));
    } catch { return null; }
  }

  /** Queue an action to sync when back online */
  queueAction(action) {
    const queue = this.getQueue();
    queue.push({ ...action, queuedAt: new Date().toISOString(), id: Date.now() });
    localStorage.setItem(OFFLINE_KEYS.QUEUE, JSON.stringify(queue));
  }

  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEYS.QUEUE)) || [];
    } catch { return []; }
  }

  clearQueue() {
    localStorage.setItem(OFFLINE_KEYS.QUEUE, JSON.stringify([]));
  }

  getLastSyncTime() {
    const t = localStorage.getItem(OFFLINE_KEYS.LAST_SYNC);
    if (!t) return null;
    const diff = Date.now() - new Date(t).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  }

  /** Offline-capable fetch — falls back to cache */
  async fetchWithFallback(url, options = {}, cacheKey = null) {
    if (this.isOnline) {
      try {
        const res = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data));
        return { data, fromCache: false };
      } catch (e) {
        if (cacheKey) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) return { data: JSON.parse(cached), fromCache: true };
        }
        throw e;
      }
    } else {
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return { data: JSON.parse(cached), fromCache: true };
      }
      throw new Error('Offline and no cached data available');
    }
  }

  async _syncQueue() {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`📡 Syncing ${queue.length} queued offline actions...`);
    const failed = [];

    for (const action of queue) {
      try {
        if (action.type === 'sos_alert') {
          await fetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload)
          });
        } else if (action.type === 'report') {
          await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload)
          });
        }
      } catch {
        failed.push(action);
      }
    }

    localStorage.setItem(OFFLINE_KEYS.QUEUE, JSON.stringify(failed));
    if (failed.length === 0) {
      console.log('✅ All queued actions synced');
    } else {
      console.warn(`⚠️ ${failed.length} actions failed to sync`);
    }
  }

  onStatusChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }

  _notify(status) {
    this._listeners.forEach(cb => cb(status));
  }
}

const offlineService = new OfflineService();
export default offlineService;