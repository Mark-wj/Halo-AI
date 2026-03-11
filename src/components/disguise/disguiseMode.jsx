/**
 * HALO Disguise Mode Service
 * Hides the app behind a functional calculator.
 * Secret PIN typed into calculator reveals HALO.
 */

const DISGUISE_KEY = 'halo_disguise_enabled';
const DISGUISE_PIN_KEY = 'halo_disguise_pin';
const DEFAULT_DISGUISE_PIN = '2911'; // Default — user should change

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

  disable() {
    this.isEnabled = false;
    localStorage.setItem(DISGUISE_KEY, 'false');
  }

  setPin(pin) {
    this.pin = pin;
    localStorage.setItem(DISGUISE_PIN_KEY, pin);
  }

  getPin() { return this.pin; }
  getIsEnabled() { return this.isEnabled; }

  checkPin(input) {
    return input === this.pin;
  }
}

export const disguiseModeService = new DisguiseModeService();

// ─── Calculator Component (React) ───────────────────────────────────────────
import React, { useState, useCallback } from 'react';

export const CalculatorDisguise = ({ onUnlock }) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [inputBuffer, setInputBuffer] = useState('');

  const handleButton = useCallback((value) => {
    // Track digit input for PIN detection
    if (/^\d$/.test(value)) {
      const newBuffer = inputBuffer + value;
      setInputBuffer(newBuffer);

      // Check if last N digits match the secret PIN
      const pin = disguiseModeService.getPin();
      if (newBuffer.slice(-pin.length) === pin) {
        setInputBuffer('');
        onUnlock();
        return;
      }
    } else {
      setInputBuffer('');
    }

    if (value === 'C') {
      setDisplay('0');
      setExpression('');
      setJustEvaluated(false);
      return;
    }

    if (value === '⌫') {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }

    if (value === '=') {
      try {
        // Safe eval — only allow numbers and operators
        const safe = expression.replace(/[^0-9+\-*/.()%]/g, '');
        const result = Function(`"use strict"; return (${safe})`)();
        const rounded = parseFloat(result.toFixed(10)).toString();
        setDisplay(rounded);
        setExpression('');
        setJustEvaluated(true);
      } catch {
        setDisplay('Error');
        setExpression('');
        setJustEvaluated(false);
      }
      return;
    }

    if (value === '%') {
      try {
        const result = parseFloat(display) / 100;
        setDisplay(result.toString());
      } catch {}
      return;
    }

    if (value === '+/-') {
      setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
      return;
    }

    const isOperator = ['+', '-', '×', '÷'].includes(value);
    const opMap = { '×': '*', '÷': '/' };
    const actualOp = opMap[value] || value;

    if (isOperator) {
      setExpression((justEvaluated ? display : expression + display) + actualOp);
      setDisplay('0');
      setJustEvaluated(false);
      return;
    }

    if (value === '.') {
      if (!display.includes('.')) {
        setDisplay(prev => (justEvaluated ? '0.' : prev + '.'));
        setJustEvaluated(false);
      }
      return;
    }

    // Digit
    if (justEvaluated) {
      setDisplay(value);
      setJustEvaluated(false);
    } else {
      setDisplay(prev => prev === '0' ? value : prev + value);
    }
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
      {/* Display */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '40px 24px 16px',
        textAlign: 'right',
      }}>
        {expression && (
          <div style={{ color: '#888', fontSize: 18, marginBottom: 4, minHeight: 24 }}>
            {expression.replace('*','×').replace('/','÷')}
          </div>
        )}
        <div style={{
          color: '#fff',
          fontSize: display.length > 9 ? 36 : display.length > 6 ? 48 : 64,
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: -2,
          wordBreak: 'break-all',
          transition: 'font-size 0.1s',
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
                    height: 72,
                    borderRadius: 36,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 28,
                    fontWeight: 400,
                    transition: 'opacity 0.1s, transform 0.08s',
                    background: isOp ? '#ff9f0a' : isFn ? '#505050' : '#333',
                    color: isOp ? '#fff' : isFn ? '#000' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isWide ? 'flex-start' : 'center',
                    paddingLeft: isWide ? 28 : 0,
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
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

      {/* Invisible hint — tiny text at bottom */}
      <p style={{ color: '#333', fontSize: 10, marginTop: 8, userSelect: 'none' }}>
        Calculator v2.1
      </p>
    </div>
  );
};

export default disguiseModeService;