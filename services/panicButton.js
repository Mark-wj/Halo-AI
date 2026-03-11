/**
 * HALO Panic Button Service
 * Triggers SOS via: device shake (3x), volume sequence (up-down-up), or 5x tap on logo
 */

class PanicButtonService {
  constructor() {
    this.isActive = false;
    this.sosCallback = null;

    // Shake config
    this.shakeThreshold = 15;
    this.shakeCountRequired = 3;
    this.shakeWindow = 2000;
    this.shakeTimes = [];
    this.lastShakeTime = 0;

    // Volume sequence
    this.volumeSequence = [];
    this.volumeSequenceRequired = ['up', 'down', 'up'];
    this.volumeSequenceWindow = 3000;

    // Tap zone
    this.tapCount = 0;
    this.tapTimer = null;
    this._lastTrigger = 0;

    this._handleMotion = this._handleMotion.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  start(callback) {
    if (this.isActive) return;
    this.sosCallback = callback;
    this.isActive = true;

    if (window.DeviceMotionEvent) {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('devicemotion', this._handleMotion, { passive: true });
            }
          }).catch(() => {});
      } else {
        window.addEventListener('devicemotion', this._handleMotion, { passive: true });
      }
    }

    window.addEventListener('keydown', this._handleKeyDown);
    this._setupMediaSession();
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    window.removeEventListener('devicemotion', this._handleMotion);
    window.removeEventListener('keydown', this._handleKeyDown);
  }

  registerTapZone(element) {
    if (!element) return;
    this._tapHandler = () => {
      this.tapCount++;
      clearTimeout(this.tapTimer);
      if (this.tapCount >= 5) {
        this.tapCount = 0;
        this._triggerSOS('tap');
        return;
      }
      this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 1500);
    };
    element.addEventListener('click', this._tapHandler);
    this._tapElement = element;
  }

  unregisterTapZone() {
    if (this._tapElement && this._tapHandler) {
      this._tapElement.removeEventListener('click', this._tapHandler);
    }
  }

  _handleMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    const magnitude = Math.sqrt((acc.x||0)**2 + (acc.y||0)**2 + (acc.z||0)**2);
    const now = Date.now();
    if (magnitude > this.shakeThreshold && (now - this.lastShakeTime) > 300) {
      this.lastShakeTime = now;
      this.shakeTimes = this.shakeTimes.filter(t => now - t < this.shakeWindow);
      this.shakeTimes.push(now);
      if (this.shakeTimes.length >= this.shakeCountRequired) {
        this.shakeTimes = [];
        this._triggerSOS('shake');
      }
    }
  }

  _handleKeyDown(e) {
    const now = Date.now();
    let direction = null;
    if (e.key === 'ArrowUp' || e.key === 'VolumeUp') direction = 'up';
    if (e.key === 'ArrowDown' || e.key === 'VolumeDown') direction = 'down';
    if (!direction) return;

    this.volumeSequence = this.volumeSequence.filter(
      entry => now - entry.time < this.volumeSequenceWindow
    );
    this.volumeSequence.push({ direction, time: now });

    const seq = this.volumeSequence.map(e => e.direction);
    const req = this.volumeSequenceRequired;
    const last = seq.slice(-req.length);
    if (last.length === req.length && last.every((v, i) => v === req[i])) {
      this.volumeSequence = [];
      this._triggerSOS('volume');
    }
  }

  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('previoustrack', () =>
        this._handleKeyDown({ key: 'VolumeDown' }));
      navigator.mediaSession.setActionHandler('nexttrack', () =>
        this._handleKeyDown({ key: 'VolumeUp' }));
    } catch(e) {}
  }

  _triggerSOS(method) {
    if (!this.isActive || !this.sosCallback) return;
    const now = Date.now();
    if (now - this._lastTrigger < 10000) return;
    this._lastTrigger = now;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    this.sosCallback({ method, timestamp: new Date().toISOString() });
  }

  async requestMotionPermission() {
    if (typeof DeviceMotionEvent?.requestPermission === 'function') {
      const result = await DeviceMotionEvent.requestPermission();
      return result === 'granted';
    }
    return true;
  }

  isShakeSupported() { return !!window.DeviceMotionEvent; }
}

const panicButton = new PanicButtonService();
export default panicButton;