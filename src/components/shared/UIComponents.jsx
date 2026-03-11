import React, { useState, useEffect } from 'react';
import { Globe, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { LANGUAGES, useTranslation } from '../../../services/i18n';
import offlineService from '../../../services/offlineService';

// ─── Language Switcher ────────────────────────────────────────────────────────
export const LanguageSwitcher = ({ compact = false }) => {
  const { lang, setLanguage, currentLanguage } = useTranslation();
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full border border-gray-200 hover:border-purple-300 transition-colors"
        >
          <span className="text-base">{currentLanguage.flag}</span>
          <span className="text-xs font-semibold text-gray-700">{currentLanguage.label}</span>
          <Globe className="h-3.5 w-3.5 text-gray-400" />
        </button>

        {open && (
          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden w-44">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-purple-50 transition-colors ${
                  lang === l.code ? 'bg-purple-50 font-semibold text-purple-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                <span className="text-sm">{l.label}</span>
                {lang === l.code && <span className="ml-auto text-purple-600 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full language selector (for settings page)
  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg">
      <div className="flex items-center space-x-2 mb-4">
        <Globe className="h-5 w-5 text-purple-600" />
        <h3 className="font-bold text-gray-900">Language / Lugha</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
              lang === l.code
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{l.flag}</span>
            <div className="text-left">
              <p className={`font-semibold text-sm ${lang === l.code ? 'text-purple-700' : 'text-gray-800'}`}>
                {l.label}
              </p>
            </div>
            {lang === l.code && (
              <span className="ml-auto text-purple-600 font-bold text-sm">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Offline Banner ───────────────────────────────────────────────────────────
export const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncMessage, setShowSyncMessage] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsub = offlineService.onStatusChange((status) => {
      setIsOnline(status === 'online');
      if (status === 'online') {
        const q = offlineService.getQueue();
        if (q.length > 0) {
          setShowSyncMessage(true);
          setTimeout(() => setShowSyncMessage(false), 4000);
        }
      }
    });

    setQueueCount(offlineService.getQueue().length);
    return unsub;
  }, []);

  if (isOnline && !showSyncMessage) return null;

  if (showSyncMessage) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2 flex items-center justify-center space-x-2 text-sm font-medium">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Back online — syncing your data...</span>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span className="font-medium">Offline mode — using cached data</span>
      </div>
      {queueCount > 0 && (
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
          {queueCount} action{queueCount > 1 ? 's' : ''} queued
        </span>
      )}
    </div>
  );
};

// ─── Panic Button Setup UI (shown in SOS settings) ───────────────────────────
export const PanicButtonSetup = ({ panicButtonService, onSOSTriggered }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [shakeSupported, setShakeSupported] = useState(false);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    setShakeSupported(panicButtonService.isShakeSupported());
    const savedEnabled = localStorage.getItem('halo_panic_button_enabled') === 'true';
    setIsEnabled(savedEnabled);
    if (savedEnabled) {
      panicButtonService.start(onSOSTriggered);
    }
  }, []);

  const togglePanicButton = async () => {
    if (!isEnabled) {
      // Request motion permission on iOS
      const granted = await panicButtonService.requestMotionPermission();
      setPermissionGranted(granted);
      panicButtonService.start(onSOSTriggered);
      setIsEnabled(true);
      localStorage.setItem('halo_panic_button_enabled', 'true');
    } else {
      panicButtonService.stop();
      setIsEnabled(false);
      localStorage.setItem('halo_panic_button_enabled', 'false');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Panic Button</h3>
          <p className="text-xs text-gray-500">Trigger SOS without opening the app</p>
        </div>
        <button
          onClick={togglePanicButton}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            isEnabled ? 'bg-red-500' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
            isEnabled ? 'translate-x-7' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-2">
          <div className={`flex items-center space-x-3 p-3 rounded-xl ${shakeSupported ? 'bg-green-50' : 'bg-gray-50'}`}>
            <span className="text-xl">{shakeSupported ? '📳' : '❌'}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Shake phone 3 times</p>
              <p className="text-xs text-gray-500">
                {shakeSupported ? 'Supported on this device' : 'Not supported on this device'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50">
            <span className="text-xl">🔊</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Volume: Up → Down → Up</p>
              <p className="text-xs text-gray-500">Press within 3 seconds</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-purple-50">
            <span className="text-xl">👆</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tap HALO logo 5 times</p>
              <p className="text-xs text-gray-500">Works on any screen</p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-700 leading-relaxed">
              ⚠️ When triggered, emergency emails are sent to all your contacts immediately.
              There is a 10-second cooldown between triggers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;