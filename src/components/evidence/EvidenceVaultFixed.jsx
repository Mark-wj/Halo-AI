import mlAPI from '../../../services/mlAPI';
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, FileText, Lock, X, Check, Download, Trash2, AlertTriangle, Brain, Sparkles, Square, Clock, RefreshCw, FlipHorizontal } from 'lucide-react';

const EvidenceVaultFixed = ({ navigateTo, userData, setUserData, mlHealthy }) => {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [storedPin, setStoredPin] = useState('');

  const [activeTab, setActiveTab] = useState('photos');
  const [photos, setPhotos] = useState([]);
  const [audioRecordings, setAudioRecordings] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [mlAnalysis, setMlAnalysis] = useState(null);
  const [analyzingJournal, setAnalyzingJournal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalEntry, setJournalEntry] = useState({
    title: '', description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    location: '', witnesses: ''
  });

  useEffect(() => {
    const savedPin = localStorage.getItem('halo_vault_pin');
    const savedPhotos = localStorage.getItem('halo_photos');
    const savedJournal = localStorage.getItem('halo_journal');
    if (savedPin) { setStoredPin(savedPin); } else { setShowPinSetup(true); setShowPinPrompt(false); }
    if (savedPhotos) { try { setPhotos(JSON.parse(savedPhotos)); } catch(e) {} }
    if (savedJournal) { try { setJournalEntries(JSON.parse(savedJournal)); } catch(e) {} }

    // Detect if device has multiple cameras
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const handleSetupPin = () => {
    if (pin.length < 4) { alert('PIN must be at least 4 digits'); return; }
    if (pin !== confirmPin) { alert('PINs do not match'); return; }
    localStorage.setItem('halo_vault_pin', pin);
    setStoredPin(pin);
    setShowPinSetup(false);
    setUnlocked(true);
    setPin(''); setConfirmPin('');
  };

  const handleUnlock = () => {
    if (pin === storedPin) { setUnlocked(true); setShowPinPrompt(false); setPin(''); }
    else { alert('Incorrect PIN'); setPin(''); }
  };

  // ── Camera ────────────────────────────────────────────────────────────────

  const startCamera = async (facing) => {
    const mode = facing || facingMode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }
      }, 100);
    } catch (error) {
      let msg = 'Unable to access camera. ';
      if (error.name === 'NotAllowedError') msg += 'Please allow camera access in browser settings.';
      else if (error.name === 'NotFoundError') msg += 'No camera found on this device.';
      else msg += error.message;
      alert(msg);
    }
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setShowCamera(false);
  };

  const flipCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    // Small delay to let tracks stop before restarting
    setTimeout(() => startCamera(newFacing), 150);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    const photo = {
      id: Date.now(),
      data: imageData,
      timestamp: new Date().toISOString(),
      location: 'GPS: Getting location...',
      type: 'photo',
      camera: facingMode === 'user' ? 'front' : 'rear'
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          photo.location = `GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
          if (mlHealthy) {
            try {
              const analysis = await mlAPI.analyzePhoto({ timestamp: photo.timestamp, location: photo.location });
              if (analysis.success) photo.mlAnalysis = analysis;
            } catch(e) {}
          }
          const newPhotos = [...photos, photo];
          setPhotos(newPhotos);
          localStorage.setItem('halo_photos', JSON.stringify(newPhotos));
        },
        () => {
          photo.location = 'GPS: Unavailable';
          const newPhotos = [...photos, photo];
          setPhotos(newPhotos);
          localStorage.setItem('halo_photos', JSON.stringify(newPhotos));
        }
      );
    } else {
      const newPhotos = [...photos, photo];
      setPhotos(newPhotos);
      localStorage.setItem('halo_photos', JSON.stringify(newPhotos));
    }
    stopCamera();
    alert('✅ Photo captured!');
  };

  const deletePhoto = (id) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    const newPhotos = photos.filter(p => p.id !== id);
    setPhotos(newPhotos);
    localStorage.setItem('halo_photos', JSON.stringify(newPhotos));
  };

  // ── Audio ─────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const recording = {
          id: Date.now(), url,
          timestamp: new Date().toISOString(),
          duration: recordingSeconds,
          type: 'audio'
        };
        if (mlHealthy) {
          try {
            const analysis = await mlAPI.analyzeAudio({ timestamp: recording.timestamp, duration: recording.duration });
            if (analysis.success) recording.mlAnalysis = analysis;
          } catch(e) {}
        }
        setAudioRecordings(prev => [...prev, recording]);
      };
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = (id) => {
    if (!confirm('Delete this recording? This cannot be undone.')) return;
    const rec = audioRecordings.find(r => r.id === id);
    if (rec?.url) URL.revokeObjectURL(rec.url);
    setAudioRecordings(prev => prev.filter(r => r.id !== id));
  };

  // ── Journal ───────────────────────────────────────────────────────────────

  const saveJournalEntryWithML = async () => {
    if (!journalEntry.title || !journalEntry.description) {
      alert('Please fill in title and description');
      return;
    }
    setAnalyzingJournal(true);
    const entry = { id: Date.now(), ...journalEntry, createdAt: new Date().toISOString(), type: 'journal', timestamp: new Date().toISOString() };
    if (mlHealthy) {
      try {
        const analysis = await mlAPI.analyzeJournal(journalEntry.description);
        if (analysis.success) {
          entry.mlAnalysis = analysis;
          setMlAnalysis(analysis);
          if (analysis.crisis_detected || analysis.requires_immediate_action) {
            const criticalIndicators = [];
            if (analysis.indicators?.strangulation) criticalIndicators.push('Strangulation');
            if (analysis.indicators?.weapons) criticalIndicators.push('Weapons');
            if (analysis.indicators?.suicidal_ideation) criticalIndicators.push('Suicidal thoughts');
            const msg = `🚨 CRISIS INDICATORS DETECTED\n\n` +
              (criticalIndicators.length ? `Indicators: ${criticalIndicators.join(', ')}\n\n` : '') +
              `Distress Level: ${analysis.distress_level}/10\n\nRecommended Actions:\n` +
              (analysis.recommended_actions || []).slice(0, 3).map((a, i) => `${i+1}. ${a}`).join('\n');
            if (confirm(msg + '\n\nActivate Emergency SOS now?')) {
              setAnalyzingJournal(false);
              navigateTo('sos');
              return;
            }
          }
        }
      } catch (error) { console.error('ML analysis error:', error); }
    }
    setAnalyzingJournal(false);
    const newEntries = [...journalEntries, entry];
    setJournalEntries(newEntries);
    localStorage.setItem('halo_journal', JSON.stringify(newEntries));
    setJournalEntry({ title: '', description: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().split(' ')[0].slice(0, 5), location: '', witnesses: '' });
    setShowJournalForm(false);
    setMlAnalysis(null);
    alert('✅ Journal entry saved!');
  };

  const deleteJournalEntry = (id) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    const newEntries = journalEntries.filter(e => e.id !== id);
    setJournalEntries(newEntries);
    localStorage.setItem('halo_journal', JSON.stringify(newEntries));
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const exportEvidence = async () => {
    setExporting(true);
    let mlSummary = null;

    if (mlHealthy && (photos.length + audioRecordings.length + journalEntries.length) > 0) {
      try {
        const allEvidence = [
          ...photos.map(p => ({ ...p, type: 'photo' })),
          ...audioRecordings.map(a => ({ ...a, type: 'audio' })),
          ...journalEntries.map(j => ({ ...j, type: 'journal' }))
        ];
        const analysis = await mlAPI.analyzeEvidenceCollection(allEvidence);
        if (analysis.success) mlSummary = analysis;
      } catch(e) {}
    }

    const exportDate = new Date().toLocaleString();
    const caseId = `HALO-${Date.now().toString(36).toUpperCase()}`;

    const photoRows = photos.map(p => `
      <div class="evidence-item">
        <div class="evidence-meta">
          <span class="badge photo">PHOTO</span>
          <strong>${new Date(p.timestamp).toLocaleString()}</strong>
          <span class="location">${p.location}</span>
          ${p.mlAnalysis ? `<span class="ai-tag">AI: ${p.mlAnalysis.evidence_quality || 'Analyzed'}</span>` : ''}
        </div>
        <img src="${p.data}" alt="Evidence photo" />
      </div>`).join('');

    const audioRows = audioRecordings.map(a => `
      <div class="evidence-item">
        <div class="evidence-meta">
          <span class="badge audio">AUDIO</span>
          <strong>${new Date(a.timestamp).toLocaleString()}</strong>
          <span>Duration: ${formatTime(a.duration)}</span>
          ${a.mlAnalysis ? `<span class="ai-tag">AI: ${a.mlAnalysis.evidence_quality || 'Analyzed'}</span>` : ''}
        </div>
        <p class="note">⚠ Audio file recorded during session. Please retain the original recording separately.</p>
      </div>`).join('');

    const journalRows = journalEntries.map(j => `
      <div class="evidence-item journal">
        <div class="evidence-meta">
          <span class="badge journal-badge">JOURNAL</span>
          <strong>${j.title}</strong>
          <span>${j.date} at ${j.time}</span>
        </div>
        <div class="journal-body">
          <p>${j.description.replace(/\n/g, '<br>')}</p>
          ${j.location ? `<p><strong>Location:</strong> ${j.location}</p>` : ''}
          ${j.witnesses ? `<p><strong>Witnesses:</strong> ${j.witnesses}</p>` : ''}
          ${j.mlAnalysis ? `
            <div class="ai-analysis sentiment-${j.mlAnalysis.sentiment}">
              <strong>AI Analysis:</strong> ${j.mlAnalysis.sentiment?.replace('_',' ')} — Distress ${j.mlAnalysis.distress_level}/10
              ${j.mlAnalysis.crisis_detected ? '<span class="crisis">⚠ CRISIS KEYWORDS DETECTED</span>' : ''}
            </div>` : ''}
        </div>
      </div>`).join('');

    const mlSection = mlSummary ? `
      <div class="section">
        <h2>AI Evidence Analysis</h2>
        <table>
          <tr><td><strong>Overall Strength</strong></td><td>${mlSummary.overall_strength || 'N/A'}</td></tr>
          <tr><td><strong>Legal Readiness</strong></td><td>${mlSummary.legal_readiness ? '✓ Yes' : '✗ No'}</td></tr>
          <tr><td><strong>Total Items</strong></td><td>${mlSummary.total_items}</td></tr>
        </table>
        ${mlSummary.recommendations?.length ? `
          <h3>Recommendations</h3>
          <ul>${(mlSummary.recommendations || []).map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HALO Evidence Report — ${caseId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; color: #1a1a1a; background: #fff; max-width: 900px; margin: 0 auto; padding: 32px; }
    .report-header { background: #7c3aed; color: white; padding: 32px; border-radius: 12px; margin-bottom: 32px; }
    .report-header h1 { font-size: 28px; margin-bottom: 8px; }
    .report-header .meta { font-size: 13px; opacity: 0.85; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 16px; }
    .confidential { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #991b1b; font-weight: 600; text-align: center; }
    .section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin-bottom: 24px; }
    .section h2 { font-size: 20px; color: #7c3aed; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .summary-card { background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card .num { font-size: 36px; font-weight: bold; color: #7c3aed; }
    .summary-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .evidence-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .evidence-item img { max-width: 100%; border-radius: 6px; margin-top: 12px; }
    .evidence-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; }
    .badge { padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge.photo { background: #dbeafe; color: #1d4ed8; }
    .badge.audio { background: #fce7f3; color: #be185d; }
    .badge.journal-badge { background: #d1fae5; color: #065f46; }
    .location { color: #6b7280; }
    .ai-tag { background: #ede9fe; color: #6d28d9; padding: 2px 8px; border-radius: 100px; font-size: 11px; }
    .journal-body { font-size: 14px; line-height: 1.6; }
    .journal-body p { margin-bottom: 8px; }
    .ai-analysis { background: #f9fafb; border-left: 3px solid #7c3aed; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-top: 10px; font-size: 13px; }
    .ai-analysis.sentiment-CRITICAL { border-color: #ef4444; background: #fef2f2; }
    .ai-analysis.sentiment-HIGH_DISTRESS { border-color: #f97316; background: #fff7ed; }
    .ai-analysis.sentiment-SAFE { border-color: #22c55e; background: #f0fdf4; }
    .crisis { display: inline-block; margin-left: 8px; color: #ef4444; font-weight: bold; }
    .note { font-size: 12px; color: #9ca3af; font-style: italic; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    table td:first-child { color: #6b7280; width: 200px; }
    ul { padding-left: 20px; font-size: 14px; line-height: 1.8; }
    .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
    @media print {
      .print-btn { display: none; }
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>

  <div class="report-header">
    <h1>HALO Evidence Report</h1>
    <p style="opacity:0.9;font-size:15px">Guardian Network — Secure Evidence Documentation</p>
    <div class="meta">
      <span><strong>Case ID:</strong> ${caseId}</span>
      <span><strong>Export Date:</strong> ${exportDate}</span>
      <span><strong>Photos:</strong> ${photos.length}</span>
      <span><strong>Audio:</strong> ${audioRecordings.length}</span>
      <span><strong>Journal Entries:</strong> ${journalEntries.length}</span>
    </div>
  </div>

  <div class="confidential">
    ⚠ CONFIDENTIAL — This document contains sensitive personal safety information. Keep secure.
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card"><div class="num">${photos.length}</div><div class="label">Photos</div></div>
      <div class="summary-card"><div class="num">${audioRecordings.length}</div><div class="label">Recordings</div></div>
      <div class="summary-card"><div class="num">${journalEntries.length}</div><div class="label">Journal Entries</div></div>
    </div>
  </div>

  ${mlSection}

  ${photos.length ? `<div class="section"><h2>Photo Evidence (${photos.length})</h2>${photoRows}</div>` : ''}
  ${audioRecordings.length ? `<div class="section"><h2>Audio Recordings (${audioRecordings.length})</h2>${audioRows}</div>` : ''}
  ${journalEntries.length ? `<div class="section"><h2>Incident Journal (${journalEntries.length})</h2>${journalRows}</div>` : ''}

  ${photos.length === 0 && audioRecordings.length === 0 && journalEntries.length === 0 ?
    '<div class="section" style="text-align:center;color:#9ca3af;padding:48px"><p style="font-size:16px">No evidence recorded yet.</p></div>' : ''}

  <div class="footer">
    <p>Generated by HALO Guardian Network • ${exportDate}</p>
    <p style="margin-top:4px">For legal assistance contact FIDA Kenya: +254 20 387-1196</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HALO-evidence-${caseId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
    alert(`✅ Evidence report downloaded!\n\nFile: HALO-evidence-${caseId}.html\n\nOpen in any browser and use Print → Save as PDF to create a court-ready PDF.`);
  };

  const getSentimentColor = (sentiment) => {
    const map = {
      'CRITICAL': 'bg-red-100 text-red-800 border-red-300',
      'HIGH_DISTRESS': 'bg-orange-100 text-orange-800 border-orange-300',
      'MODERATE': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'LOW': 'bg-blue-100 text-blue-800 border-blue-300',
      'SAFE': 'bg-green-100 text-green-800 border-green-300',
    };
    return map[sentiment] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // ── PIN Setup ─────────────────────────────────────────────────────────────
  if (showPinSetup) return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Up Vault PIN</h2>
          <p className="text-gray-600">Create a secure PIN to protect your evidence</p>
        </div>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN (4-6 digits)" maxLength={6} className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono mb-3 focus:border-orange-400 focus:outline-none" />
        <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Confirm PIN" maxLength={6} className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono mb-4 focus:border-orange-400 focus:outline-none" />
        <button onClick={handleSetupPin} disabled={pin.length < 4 || pin !== confirmPin} className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 mb-3">Create PIN</button>
        <button onClick={() => navigateTo('landing')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium">Cancel</button>
      </div>
    </div>
  );

  // ── PIN Unlock ────────────────────────────────────────────────────────────
  if (showPinPrompt && !unlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Evidence Vault</h2>
          <p className="text-gray-600">Enter your PIN to access encrypted evidence</p>
        </div>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleUnlock()} placeholder="Enter PIN" maxLength={6} autoFocus className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono mb-4 focus:border-orange-400 focus:outline-none" />
        <button onClick={handleUnlock} disabled={pin.length < 4} className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 mb-3">Unlock Vault</button>
        <button onClick={() => navigateTo('landing')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium">Cancel</button>
      </div>
    </div>
  );

  // ── Camera View ───────────────────────────────────────────────────────────
  if (showCamera) return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={stopCamera} className="bg-black/40 backdrop-blur-sm text-white p-3 rounded-full active:scale-95 transition-transform">
            <X className="h-6 w-6" />
          </button>
          <div className="bg-black/40 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
            📷 Evidence Camera — {facingMode === 'user' ? 'Front' : 'Rear'}
          </div>
          {/* Camera flip — only show if multiple cameras detected */}
          {hasMultipleCameras && (
            <button onClick={flipCamera} className="bg-black/40 backdrop-blur-sm text-white p-3 rounded-full active:scale-95 transition-transform">
              <RefreshCw className="h-6 w-6" />
            </button>
          )}
          {!hasMultipleCameras && <div className="w-12" />}
        </div>

        {/* Focus ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-white/40 rounded-lg" />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 backdrop-blur-sm p-6">
        <div className="flex justify-center items-center gap-8">
          <button onClick={stopCamera} className="bg-white/10 text-white p-5 rounded-full active:scale-95 transition-transform border border-white/20">
            <X className="h-7 w-7" />
          </button>
          {/* Shutter button */}
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <div className="w-14 h-14 bg-white rounded-full" />
          </button>
          {/* Camera flip button on bottom bar for mobile */}
          <button onClick={flipCamera} className="bg-white/10 text-white p-5 rounded-full active:scale-95 transition-transform border border-white/20">
            <RefreshCw className="h-7 w-7" />
          </button>
        </div>
        <p className="text-white/50 text-xs text-center mt-3">Tap the white circle to capture</p>
      </div>
    </div>
  );

  // ── Journal Form ──────────────────────────────────────────────────────────
  if (showJournalForm) return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">New Journal Entry</h3>
            <button onClick={() => setShowJournalForm(false)} className="text-gray-600 hover:text-gray-900"><X className="h-6 w-6" /></button>
          </div>
          {mlHealthy && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-purple-800">AI will scan for crisis indicators on save</span>
            </div>
          )}
          <input type="text" placeholder="Incident Title *" value={journalEntry.title} onChange={e => setJournalEntry({...journalEntry, title: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-orange-400 focus:outline-none" />
          <textarea placeholder="Detailed Description * (What happened, who was involved, what was said...)" value={journalEntry.description} onChange={e => setJournalEntry({...journalEntry, description: e.target.value})} className="w-full h-40 p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-orange-400 focus:outline-none resize-none" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="date" value={journalEntry.date} onChange={e => setJournalEntry({...journalEntry, date: e.target.value})} className="p-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none" />
            <input type="time" value={journalEntry.time} onChange={e => setJournalEntry({...journalEntry, time: e.target.value})} className="p-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none" />
          </div>
          <input type="text" placeholder="Location (optional)" value={journalEntry.location} onChange={e => setJournalEntry({...journalEntry, location: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-orange-400 focus:outline-none" />
          <input type="text" placeholder="Witnesses (optional)" value={journalEntry.witnesses} onChange={e => setJournalEntry({...journalEntry, witnesses: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 focus:border-orange-400 focus:outline-none" />
          <button onClick={saveJournalEntryWithML} disabled={analyzingJournal} className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">
            {analyzingJournal ? <span className="flex items-center justify-center space-x-2"><Brain className="h-5 w-5 animate-pulse" /><span>Analyzing with AI...</span></span> : 'Save Entry with AI Analysis'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main Vault ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigateTo('landing')} className="text-gray-600 hover:text-gray-900 flex items-center space-x-2">
              <span>←</span><span>Back</span>
            </button>
            <div className="flex space-x-3">
              <button
                onClick={exportEvidence}
                disabled={exporting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                {exporting ? <><Brain className="h-4 w-4 animate-pulse" /><span>Preparing...</span></> : <><Download className="h-4 w-4" /><span>Export Report</span></>}
              </button>
              <button onClick={() => { setUnlocked(false); setShowPinPrompt(true); setPin(''); }} className="text-red-600 hover:text-red-700 flex items-center space-x-2 font-medium">
                <Lock className="h-4 w-4" /><span>Lock</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl"><Lock className="h-6 w-6 text-white" /></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Evidence Vault</h2>
              <p className="text-gray-600">
                {photos.length} photos • {audioRecordings.length} recordings • {journalEntries.length} entries
                {mlHealthy && <span className="ml-2 text-purple-600 font-medium">• AI-analyzed</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex space-x-2">
            {['photos', 'audio', 'journal'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 rounded-xl font-semibold capitalize transition-all ${activeTab === tab ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {tab === 'photos' && <Camera className="h-4 w-4 inline mr-2" />}
                {tab === 'audio' && <Mic className="h-4 w-4 inline mr-2" />}
                {tab === 'journal' && <FileText className="h-4 w-4 inline mr-2" />}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 shadow-lg min-h-96">

          {activeTab === 'photos' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Photo Evidence</h3>
                <button onClick={() => startCamera()} className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center space-x-2">
                  <Camera className="h-5 w-5" /><span>Take Photo</span>
                </button>
              </div>
              {photos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No photos captured yet</p>
                  <p className="text-sm text-gray-500 mt-1">Photos are GPS-tagged and timestamped automatically</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <img src={photo.data} alt="Evidence" className="w-full h-48 object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                        <button onClick={() => deletePhoto(photo.id)} className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-lg">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{new Date(photo.timestamp).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{photo.location}</p>
                      {photo.mlAnalysis && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI: {photo.mlAnalysis.evidence_quality}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audio' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Audio Recordings</h3>
                {!isRecording ? (
                  <button onClick={startRecording} className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center space-x-2">
                    <Mic className="h-5 w-5" /><span>Start Recording</span>
                  </button>
                ) : (
                  <button onClick={stopRecording} className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                      <Clock className="h-4 w-4" />
                      <span className="font-mono">{formatTime(recordingSeconds)}</span>
                    </div>
                    <Square className="h-5 w-5 text-red-400" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
              {isRecording && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center space-x-3 animate-pulse">
                  <div className="h-4 w-4 bg-red-500 rounded-full animate-ping"></div>
                  <span className="text-red-800 font-semibold">Recording in progress — {formatTime(recordingSeconds)}</span>
                </div>
              )}
              {audioRecordings.length === 0 && !isRecording ? (
                <div className="text-center py-12">
                  <Mic className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No audio recordings yet</p>
                  <p className="text-sm text-gray-500 mt-1">Recordings are session-only and not stored between visits</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {audioRecordings.map(recording => (
                    <div key={recording.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{new Date(recording.timestamp).toLocaleString()}</p>
                          {recording.duration > 0 && <p className="text-xs text-gray-500">Duration: {formatTime(recording.duration)}</p>}
                          {recording.mlAnalysis && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1 inline-block">AI: {recording.mlAnalysis.evidence_quality || 'Analyzed'}</span>}
                        </div>
                        <button onClick={() => deleteRecording(recording.id)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="h-5 w-5" /></button>
                      </div>
                      <audio controls src={recording.url} className="w-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'journal' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Incident Journal</h3>
                <button onClick={() => setShowJournalForm(true)} className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5" /><span>New Entry</span>
                </button>
              </div>
              {journalEntries.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No journal entries yet</p>
                  <p className="text-sm text-gray-500 mt-1">Document incidents with date, time, location and witnesses</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {journalEntries.map(entry => (
                    <div key={entry.id} className="p-6 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">{entry.title}</h4>
                          <p className="text-sm text-gray-600">{entry.date} at {entry.time}</p>
                        </div>
                        <button onClick={() => deleteJournalEntry(entry.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-5 w-5" /></button>
                      </div>
                      <p className="text-gray-700 mb-3 whitespace-pre-wrap">{entry.description}</p>
                      {entry.location && <p className="text-sm text-gray-600 mb-1">📍 {entry.location}</p>}
                      {entry.witnesses && <p className="text-sm text-gray-600 mb-3">👥 Witnesses: {entry.witnesses}</p>}
                      {entry.mlAnalysis && (
                        <div className={`mt-3 p-3 rounded-xl border ${getSentimentColor(entry.mlAnalysis.sentiment)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2"><Brain className="h-4 w-4" /><span className="text-sm font-semibold">AI Analysis</span></div>
                            <span className="text-xs font-bold">{entry.mlAnalysis.sentiment?.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Distress: {entry.mlAnalysis.distress_level}/10</span>
                            <span>{(entry.mlAnalysis.confidence * 100).toFixed(0)}% confidence</span>
                          </div>
                          {entry.mlAnalysis.crisis_detected && (
                            <div className="mt-2 flex items-center space-x-1 text-xs font-bold text-red-700">
                              <AlertTriangle className="h-3 w-3" /><span>Crisis keywords detected</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceVaultFixed;