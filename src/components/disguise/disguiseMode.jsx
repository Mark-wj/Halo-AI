/**
 * HALO Disguise Mode Service
 * Hides the app behind a functional calculator.
 * Secret PIN typed into calculator reveals HALO.
 * Supports PWA install ("Add to Home Screen").
 */

const DISGUISE_KEY = 'halo_disguise_enabled';
const DISGUISE_PIN_KEY = 'halo_disguise_pin';
const DEFAULT_DISGUISE_PIN = '2911';

class DisguiseModeService {
  constructor() {
    this.isEnabled = localStorage.getItem(DISGUISE_KEY) === 'true';
    this.pin = localStorage.getItem(DISGUISE_PIN_KEY) || DEFAULT_DISGUISE_PIN;
  }
  enable(pin) {
    this.isEnabled = true;
    this.pin = pin || DEFAULT_DISGUISE_PIN;
    localStorage.setItem(DISGUISE_KEY, 'true');
    localStorage.setItem(DISGUISE_PIN_KEY, this.pin);
  }
  disable() { this.isEnabled = false; localStorage.setItem(DISGUISE_KEY, 'false'); }
  setPin(pin) { this.pin = pin; localStorage.setItem(DISGUISE_PIN_KEY, pin); }
  getPin() { return this.pin; }
  getIsEnabled() { return this.isEnabled; }
  checkPin(input) { return input === this.pin; }
}

export const disguiseModeService = new DisguiseModeService();

// ─── Calculator Component ────────────────────────────────────────────────────
import React, { useState, useCallback, useEffect, useRef } from 'react';

export const CalculatorDisguise = ({ onUnlock }) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [inputBuffer, setInputBuffer] = useState('');

  // PWA install state
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Detect iOS — Safari doesn't support beforeinstallprompt
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window).MSStream;
    setIsIOS(ios);

    // Detect if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator).standalone === true;
    setIsInstalled(isStandalone);

    // Capture Chrome/Android install prompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isInstalled) return;

    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!installPrompt) {
      // Prompt not available yet — show manual instructions
      alert(
        'To install this app:\n\n' +
        '• Chrome: Menu (⋮) → "Add to Home screen"\n' +
        '• Edge: Menu → "Apps" → "Install"\n' +
        '• Firefox: Menu → "Install"\n\n' +
        'The app will appear as "Calculator" on your home screen.'
      );
      return;
    }

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleButton = useCallback((value) => {
    if (/^\d$/.test(value)) {
      const newBuffer = inputBuffer + value;
      setInputBuffer(newBuffer);
      const pin = disguiseModeService.getPin();
      if (newBuffer.slice(-pin.length) === pin) {
        setInputBuffer('');
        onUnlock();
        return;
      }
    } else {
      setInputBuffer('');
    }

    if (value === 'C') { setDisplay('0'); setExpression(''); setJustEvaluated(false); return; }
    if (value === '⌫') { setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0'); return; }

    if (value === '=') {
      try {
        const safe = expression.replace(/[^0-9+\-*/.()%]/g, '');
        const result = Function(`"use strict"; return (${safe})`)();
        const rounded = parseFloat(result.toFixed(10)).toString();
        setDisplay(rounded); setExpression(''); setJustEvaluated(true);
      } catch { setDisplay('Error'); setExpression(''); setJustEvaluated(false); }
      return;
    }

    if (value === '%') {
      try { setDisplay((parseFloat(display) / 100).toString()); } catch {}
      return;
    }

    if (value === '+/-') { setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev); return; }

    const isOperator = ['+', '-', '×', '÷'].includes(value);
    const opMap = { '×': '*', '÷': '/' };
    const actualOp = opMap[value] || value;

    if (isOperator) {
      setExpression((justEvaluated ? display : expression + display) + actualOp);
      setDisplay('0'); setJustEvaluated(false);
      return;
    }

    if (value === '.') {
      if (!display.includes('.')) { setDisplay(prev => justEvaluated ? '0.' : prev + '.'); setJustEvaluated(false); }
      return;
    }

    // Digit
    if (justEvaluated) { setDisplay(value); setJustEvaluated(false); }
    else { setDisplay(prev => prev === '0' ? value : prev + value); }
  }, [display, expression, justEvaluated, inputBuffer, onUnlock]);

  const buttons = [
    ['C', '+/-', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '='],
  ];

  const isOperatorBtn = (v) => ['÷', '×', '-', '+', '='].includes(v);
  const isFunctionBtn = (v) => ['C', '+/-', '%'].includes(v);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 0 24px 0',
      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
    }}>

      {/* iOS Install Guide */}
      {showIOSGuide && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 100, padding: '0 16px 32px',
        }}>
          <div style={{
            background: '#2a2a2a', borderRadius: 20, padding: 24, maxWidth: 380, width: '100%',
            border: '1px solid #444',
          }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Add to Home Screen
            </h3>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              1. Tap the <strong style={{color:'#fff'}}>Share</strong> button at the bottom of Safari (the box with an arrow pointing up)
            </p>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              2. Scroll down and tap <strong style={{color:'#fff'}}>"Add to Home Screen"</strong>
            </p>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              3. Tap <strong style={{color:'#fff'}}>"Add"</strong> — the app will appear as "Calculator" on your home screen
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                width: '100%', padding: '14px', background: '#ff9f0a',
                border: 'none', borderRadius: 14, color: '#000',
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
          {/* Arrow pointing down to indicate share button location */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            color: '#ff9f0a', fontSize: 24,
          }}>↓</div>
        </div>
      )}

      {/* Install bar — shown when not yet installed */}
      {!isInstalled && (
        <div style={{
          width: '100%', maxWidth: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: '#333', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🧮</div>
            <div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>Calculator</p>
              <p style={{ color: '#666', fontSize: 11, margin: 0 }}>Free app</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            style={{
              background: '#0a84ff', color: '#fff',
              border: 'none', borderRadius: 20,
              padding: '8px 18px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '-0.2px',
            }}
          >
            {installPrompt || isIOS ? 'Get' : 'Install'}
          </button>
        </div>
      )}

      {/* Display */}
      <div style={{ width: '100%', maxWidth: 400, padding: '20px 24px 16px', textAlign: 'right' }}>
        {expression && (
          <div style={{ color: '#888', fontSize: 18, marginBottom: 4, minHeight: 24 }}>
            {expression.replace('*', '×').replace('/', '÷')}
          </div>
        )}
        <div style={{
          color: '#fff',
          fontSize: display.length > 9 ? 36 : display.length > 6 ? 48 : 64,
          fontWeight: 300, lineHeight: 1, letterSpacing: -2,
          wordBreak: 'break-all', transition: 'font-size 0.1s',
        }}>
          {display}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        {buttons.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {row.map((btn, bi) => {
              const isWide = btn === '0';
              const isOp = isOperatorBtn(btn);
              const isFn = isFunctionBtn(btn);
              return (
                <button
                  key={bi}
                  onClick={() => handleButton(btn)}
                  style={{
                    flex: isWide ? 2.08 : 1,
                    aspectRatio: isWide ? 'unset' : '1',
                    height: 72, borderRadius: 36, border: 'none',
                    cursor: 'pointer', fontSize: 28, fontWeight: 400,
                    transition: 'opacity 0.1s, transform 0.08s',
                    background: isOp ? '#ff9f0a' : isFn ? '#505050' : '#333',
                    color: isOp ? '#fff' : isFn ? '#000' : '#fff',
                    display: 'flex', alignItems: 'center',
                    justifyContent: isWide ? 'flex-start' : 'center',
                    paddingLeft: isWide ? 28 : 0,
                    WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                  }}
                  onMouseDown={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(0.95)'; }}
                  onMouseUp={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                  onTouchStart={e => { e.currentTarget.style.opacity = '0.7'; }}
                  onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {btn}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p style={{ color: '#2a2a2a', fontSize: 10, marginTop: 8, userSelect: 'none' }}>Calculator v2.1</p>
    </div>
  );
};

export default disguiseModeService;