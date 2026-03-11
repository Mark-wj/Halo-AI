import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronRight, AlertTriangle, Shield, Phone, MapPin, Lock, Heart, Plus, Trash2, Edit3, Save, X } from 'lucide-react';

const STORAGE_KEY = 'halo_safety_plan';

const PLAN_SECTIONS = [
  {
    id: 'signals',
    title: 'Warning Signs & Triggers',
    icon: '⚠️',
    color: 'from-yellow-500 to-orange-500',
    description: 'Signs that danger is escalating',
    defaultItems: [
      'Partner starts drinking heavily',
      'Partner becomes very controlling or jealous',
      'Partner blocks exits or takes my phone',
      'Partner makes death threats',
    ]
  },
  {
    id: 'escape',
    title: 'Escape Route',
    icon: '🚪',
    color: 'from-blue-500 to-blue-600',
    description: 'How to leave quickly and safely',
    defaultItems: [
      'Know all exits from the house',
      'Keep car keys and bag near the door',
      'Have a code word with trusted person',
      'Know which neighbours are safe to go to',
    ]
  },
  {
    id: 'bag',
    title: 'Emergency Bag',
    icon: '👜',
    color: 'from-purple-500 to-purple-600',
    description: 'What to grab when leaving fast',
    defaultItems: [
      'National ID / Passport',
      'Phone + charger',
      'Cash (at least 3 days\' worth)',
      'Medication (if any)',
      'Children\'s documents',
      'Evidence copies (from HALO vault)',
    ]
  },
  {
    id: 'contacts',
    title: 'Safe People to Call',
    icon: '📞',
    color: 'from-green-500 to-green-600',
    description: 'Trusted contacts who know your situation',
    defaultItems: [
      'GBV Hotline: 1195 (free, 24/7)',
      'Police Emergency: 999',
      'Name a trusted family member',
      'Name a trusted friend',
      'Legal aid: FIDA Kenya +254 20 387-1196',
    ]
  },
  {
    id: 'safeplace',
    title: 'Safe Places to Go',
    icon: '🏠',
    color: 'from-teal-500 to-teal-600',
    description: 'Where you can go in an emergency',
    defaultItems: [
      'COVAW Shelter, Nairobi: +254 20 2731410',
      'Home of trusted family member',
      'Home of trusted friend',
      'Nearest police station',
    ]
  },
  {
    id: 'children',
    title: 'Protecting Children',
    icon: '👶',
    color: 'from-pink-500 to-pink-600',
    description: 'Keeping children safe',
    defaultItems: [
      'School knows not to release children to abuser',
      'Children know the code word to leave fast',
      'Children know to call a safe adult',
      'Have children\'s important documents ready',
    ]
  },
  {
    id: 'legal',
    title: 'Legal Steps',
    icon: '⚖️',
    color: 'from-indigo-500 to-indigo-600',
    description: 'Legal protections available to you',
    defaultItems: [
      'Apply for a protection order at magistrate court',
      'File a police report (get OB number)',
      'Contact FIDA Kenya for free legal help',
      'Keep copies of all evidence in HALO vault',
    ]
  },
];

const SafetyPlanBuilder = ({ navigateTo }) => {
  const [plan, setPlan] = useState({});
  const [expandedSection, setExpandedSection] = useState('signals');
  const [editingItem, setEditingItem] = useState(null); // { sectionId, index }
  const [editText, setEditText] = useState('');
  const [addingTo, setAddingTo] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showCompletedBanner, setShowCompletedBanner] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPlan(JSON.parse(saved));
      } catch {}
    } else {
      // Initialize with default items, all unchecked
      const initial = {};
      PLAN_SECTIONS.forEach(section => {
        initial[section.id] = {
          items: section.defaultItems.map(text => ({ text, checked: false, custom: false }))
        };
      });
      setPlan(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    let done = 0, total = 0;
    Object.values(plan).forEach(section => {
      (section.items || []).forEach(item => {
        total++;
        if (item.checked) done++;
      });
    });
    setCompletedCount(done);
    setTotalCount(total);
    if (done > 0 && done === total) setShowCompletedBanner(true);
  }, [plan]);

  const savePlan = (updated) => {
    setPlan(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleItem = (sectionId, index) => {
    const updated = { ...plan };
    updated[sectionId].items[index].checked = !updated[sectionId].items[index].checked;
    savePlan(updated);
  };

  const deleteItem = (sectionId, index) => {
    const updated = { ...plan };
    updated[sectionId].items.splice(index, 1);
    savePlan(updated);
  };

  const startEdit = (sectionId, index) => {
    setEditingItem({ sectionId, index });
    setEditText(plan[sectionId].items[index].text);
  };

  const saveEdit = () => {
    if (!editingItem || !editText.trim()) return;
    const updated = { ...plan };
    updated[editingItem.sectionId].items[editingItem.index].text = editText.trim();
    savePlan(updated);
    setEditingItem(null);
    setEditText('');
  };

  const addItem = (sectionId) => {
    if (!newItemText.trim()) return;
    const updated = { ...plan };
    if (!updated[sectionId]) updated[sectionId] = { items: [] };
    updated[sectionId].items.push({ text: newItemText.trim(), checked: false, custom: true });
    savePlan(updated);
    setNewItemText('');
    setAddingTo(null);
  };

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!Object.keys(plan).length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-600">Loading your safety plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')}
            className="text-gray-500 hover:text-gray-800 mb-4 flex items-center space-x-2 text-sm">
            <span>←</span><span>Back to Home</span>
          </button>
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Safety Plan</h2>
              <p className="text-gray-500 text-sm">Personal escape and protection plan</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Plan Completion</span>
              <span className="text-sm font-bold text-blue-600">{completedCount}/{totalCount} steps</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-3 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {progress === 0 && 'Check off steps as you complete them'}
              {progress > 0 && progress < 50 && 'Good start — keep going'}
              {progress >= 50 && progress < 100 && 'More than halfway there'}
              {progress === 100 && '✅ Safety plan complete!'}
            </p>
          </div>
        </div>

        {showCompletedBanner && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-5 mb-6 shadow-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold">Safety Plan Complete!</p>
                <p className="text-sm opacity-90">You've prepared all steps. Review and update regularly.</p>
              </div>
            </div>
            <button onClick={() => setShowCompletedBanner(false)}>
              <X className="h-5 w-5 opacity-70" />
            </button>
          </div>
        )}

        {/* Sections */}
        {PLAN_SECTIONS.map(section => {
          const sectionData = plan[section.id] || { items: [] };
          const sectionDone = sectionData.items.filter(i => i.checked).length;
          const sectionTotal = sectionData.items.length;
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`bg-gradient-to-r ${section.color} w-10 h-10 rounded-xl flex items-center justify-center text-lg`}>
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{section.title}</p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    sectionDone === sectionTotal && sectionTotal > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {sectionDone}/{sectionTotal}
                  </span>
                  {isExpanded
                    ? <ChevronDown className="h-5 w-5 text-gray-400" />
                    : <ChevronRight className="h-5 w-5 text-gray-400" />
                  }
                </div>
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="space-y-2 mt-4">
                    {sectionData.items.map((item, idx) => (
                      <div key={idx} className={`flex items-start space-x-3 p-3 rounded-xl transition-colors ${
                        item.checked ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleItem(section.id, idx)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                            item.checked
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {item.checked && <Check className="h-4 w-4 text-white" />}
                        </button>

                        {/* Text or Edit */}
                        {editingItem?.sectionId === section.id && editingItem?.index === idx ? (
                          <div className="flex-1 flex space-x-2">
                            <input
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && saveEdit()}
                              autoFocus
                              className="flex-1 p-1 border-b-2 border-blue-400 bg-transparent text-sm focus:outline-none"
                            />
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                              <Save className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingItem(null)} className="text-gray-400">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-start justify-between">
                            <p className={`text-sm leading-relaxed ${
                              item.checked ? 'line-through text-gray-400' : 'text-gray-700'
                            }`}>
                              {item.text}
                            </p>
                            <div className="flex space-x-1 ml-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                              <button
                                onClick={() => startEdit(section.id, idx)}
                                className="text-gray-400 hover:text-blue-500 p-1"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              {item.custom && (
                                <button
                                  onClick={() => deleteItem(section.id, idx)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add custom item */}
                  {addingTo === section.id ? (
                    <div className="mt-3 flex space-x-2">
                      <input
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addItem(section.id)}
                        placeholder="Add your own step..."
                        autoFocus
                        className="flex-1 p-3 border-2 border-blue-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button onClick={() => addItem(section.id)}
                        className="bg-blue-600 text-white px-4 rounded-xl font-semibold text-sm">
                        Add
                      </button>
                      <button onClick={() => { setAddingTo(null); setNewItemText(''); }}
                        className="bg-gray-200 text-gray-700 px-3 rounded-xl">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(section.id)}
                      className="mt-3 w-full p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add custom step</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom Actions */}
        <div className="space-y-3 mt-2 mb-8">
          <button
            onClick={() => navigateTo('resources')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold shadow-lg"
          >
            📍 Find Shelters & Support Near Me
          </button>
          <button
            onClick={() => navigateTo('sos')}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold shadow-lg"
          >
            🚨 Emergency SOS
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyPlanBuilder;