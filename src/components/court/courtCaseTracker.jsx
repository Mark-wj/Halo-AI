import React, { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, Hash, ChevronRight, ChevronDown, Trash2, Edit3, Save, X, AlertCircle, Check, Clock } from 'lucide-react';

const STORAGE_KEY = 'halo_court_cases';

const STATUS_CONFIG = {
  'active': { label: 'Active', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  'hearing_scheduled': { label: 'Hearing Scheduled', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  'awaiting_judgment': { label: 'Awaiting Judgment', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  'protection_order': { label: 'Protection Order', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  'closed': { label: 'Closed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const CASE_TYPES = ['Criminal (GBV)', 'Protection Order', 'Divorce/Separation', 'Child Custody', 'Civil Suit', 'Police Report'];

const CourtCaseTracker = ({ navigateTo }) => {
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedCase, setExpandedCase] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  const [form, setForm] = useState({
    title: '',
    type: 'Criminal (GBV)',
    caseNumber: '',
    obNumber: '',
    court: '',
    judge: '',
    lawyerName: '',
    lawyerPhone: '',
    status: 'active',
    nextHearing: '',
    notes: [],
    filedDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCases(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (updated) => {
    setCases(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addCase = () => {
    if (!form.title) return;
    const newCase = {
      ...form,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      notes: [],
    };
    save([...cases, newCase]);
    setShowForm(false);
    setForm({
      title: '', type: 'Criminal (GBV)', caseNumber: '', obNumber: '',
      court: '', judge: '', lawyerName: '', lawyerPhone: '',
      status: 'active', nextHearing: '', notes: [],
      filedDate: new Date().toISOString().split('T')[0],
    });
    setExpandedCase(newCase.id);
  };

  const updateStatus = (caseId, status) => {
    save(cases.map(c => c.id === caseId ? { ...c, status } : c));
  };

  const addNote = (caseId) => {
    if (!noteText.trim()) return;
    const note = {
      id: Date.now(),
      text: noteText.trim(),
      date: new Date().toISOString(),
    };
    save(cases.map(c =>
      c.id === caseId ? { ...c, notes: [...(c.notes || []), note] } : c
    ));
    setNoteText('');
    setEditingNote(null);
  };

  const deleteCase = (caseId) => {
    if (!confirm('Delete this case record? This cannot be undone.')) return;
    save(cases.filter(c => c.id !== caseId));
    if (expandedCase === caseId) setExpandedCase(null);
  };

  const deleteNote = (caseId, noteId) => {
    save(cases.map(c =>
      c.id === caseId
        ? { ...c, notes: (c.notes || []).filter(n => n.id !== noteId) }
        : c
    ));
  };

  const upcomingHearings = cases
    .filter(c => c.nextHearing && new Date(c.nextHearing) >= new Date())
    .sort((a, b) => new Date(a.nextHearing) - new Date(b.nextHearing));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')}
            className="text-gray-500 hover:text-gray-800 mb-4 flex items-center space-x-2 text-sm">
            <span>←</span><span>Back to Home</span>
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Case Tracker</h2>
                <p className="text-gray-500 text-sm">{cases.length} case{cases.length !== 1 ? 's' : ''} tracked</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center space-x-2 shadow-lg"
            >
              <Plus className="h-4 w-4" /><span>Add Case</span>
            </button>
          </div>
        </div>

        {/* Upcoming Hearings Alert */}
        {upcomingHearings.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-yellow-900">Upcoming Hearings</h3>
            </div>
            {upcomingHearings.map(c => {
              const days = Math.ceil((new Date(c.nextHearing) - new Date()) / 86400000);
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-t border-yellow-100">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
                    <p className="text-xs text-gray-600">{c.court || 'Court TBD'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-700">
                      {new Date(c.nextHearing).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Case Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 border-2 border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">New Case</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input placeholder="Case title / description *" value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />

              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm bg-white">
                {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Case Number (e.g. CRM/001/2026)" value={form.caseNumber}
                  onChange={e => setForm({...form, caseNumber: e.target.value})}
                  className="p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />
                <input placeholder="OB Number (Police)" value={form.obNumber}
                  onChange={e => setForm({...form, obNumber: e.target.value})}
                  className="p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />
              </div>

              <input placeholder="Court (e.g. Milimani Law Courts)" value={form.court}
                onChange={e => setForm({...form, court: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Lawyer / Legal Aid name" value={form.lawyerName}
                  onChange={e => setForm({...form, lawyerName: e.target.value})}
                  className="p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />
                <input placeholder="Lawyer phone" value={form.lawyerPhone}
                  onChange={e => setForm({...form, lawyerPhone: e.target.value})}
                  className="p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date Filed</label>
                  <input type="date" value={form.filedDate}
                    onChange={e => setForm({...form, filedDate: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Next Hearing (if known)</label>
                  <input type="date" value={form.nextHearing}
                    onChange={e => setForm({...form, nextHearing: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-sm" />
                </div>
              </div>

              <button onClick={addCase} disabled={!form.title}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 shadow-lg">
                Save Case
              </button>
            </div>
          </div>
        )}

        {/* Cases List */}
        {cases.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No cases tracked yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Track police reports, protection orders, and court proceedings
            </p>
            <button onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold">
              Add Your First Case
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map(c => {
              const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;
              const isExpanded = expandedCase === c.id;

              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Case Header */}
                  <button
                    onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                    className="w-full p-5 flex items-start justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`}></div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{c.type}</span>
                      </div>
                      <p className="font-bold text-gray-900">{c.title}</p>
                      {c.caseNumber && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center space-x-1">
                          <Hash className="h-3 w-3" />
                          <span>{c.caseNumber}</span>
                        </p>
                      )}
                      {c.nextHearing && (
                        <p className="text-xs text-indigo-600 mt-1 flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Next: {new Date(c.nextHearing).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                      : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    }
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100">

                      {/* Status Update */}
                      <div className="mt-4 mb-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Update Status</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <button key={key}
                              onClick={() => updateStatus(c.id, key)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                c.status === key
                                  ? `${cfg.color} ring-2 ring-offset-1 ring-indigo-400`
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}>
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {c.obNumber && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">OB Number</p>
                            <p className="font-semibold text-sm text-gray-900">{c.obNumber}</p>
                          </div>
                        )}
                        {c.court && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Court</p>
                            <p className="font-semibold text-sm text-gray-900">{c.court}</p>
                          </div>
                        )}
                        {c.lawyerName && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Lawyer</p>
                            <p className="font-semibold text-sm text-gray-900">{c.lawyerName}</p>
                            {c.lawyerPhone && (
                              <a href={`tel:${c.lawyerPhone}`} className="text-xs text-blue-600">
                                {c.lawyerPhone}
                              </a>
                            )}
                          </div>
                        )}
                        {c.filedDate && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Date Filed</p>
                            <p className="font-semibold text-sm text-gray-900">
                              {new Date(c.filedDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                          Case Notes ({(c.notes || []).length})
                        </label>
                        <div className="space-y-2 mb-3">
                          {(c.notes || []).map(note => (
                            <div key={note.id} className="flex items-start space-x-2 p-3 bg-indigo-50 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">{note.text}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(note.date).toLocaleString()}
                                </p>
                              </div>
                              <button onClick={() => deleteNote(c.id, note.id)} className="text-gray-300 hover:text-red-500">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {editingNote === c.id ? (
                          <div className="flex space-x-2">
                            <input value={noteText} onChange={e => setNoteText(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && addNote(c.id)}
                              placeholder="Add a note (hearing outcome, what happened...)"
                              autoFocus
                              className="flex-1 p-2.5 border-2 border-indigo-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                            <button onClick={() => addNote(c.id)}
                              className="bg-indigo-600 text-white px-4 rounded-xl text-sm font-semibold">
                              Add
                            </button>
                            <button onClick={() => { setEditingNote(null); setNoteText(''); }}
                              className="bg-gray-200 text-gray-700 px-3 rounded-xl">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingNote(c.id)}
                            className="w-full p-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center space-x-2">
                            <Plus className="h-4 w-4" /><span>Add note</span>
                          </button>
                        )}
                      </div>

                      <button onClick={() => deleteCase(c.id)}
                        className="mt-4 w-full p-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center space-x-2">
                        <Trash2 className="h-4 w-4" /><span>Delete Case</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-800 leading-relaxed">
            💡 <strong>Free legal help:</strong> FIDA Kenya (+254 20 387-1196) provides free legal aid for GBV survivors.
            For protection orders, visit your nearest magistrate court.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourtCaseTracker;