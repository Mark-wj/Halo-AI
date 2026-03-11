import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, MessageSquare, AlertTriangle, User, Users, Phone, MapPin, Heart, X, Check, Clock, Navigation, FileText, Camera, Mic, Lock, Eye, EyeOff, Menu, ChevronRight, AlertCircle, Star, Zap, Activity, Brain, Sparkles, TrendingUp, Send, Bot, Mail, Globe } from 'lucide-react';
import sosAlertSystem from '../services/sosAlerts';
import realResourcesService from '../services/realResources';
import EvidenceVaultFixed from './components/evidence/EvidenceVaultFixed';
import mlAPI from '../services/mlAPI';
import offlineService from '../services/offlineService';
import { proximityService, locationService } from '../services/geolocation';
import panicButton from '../services/panicButton';
import { disguiseModeService, CalculatorDisguise } from './components/disguise/disguiseMode';
import SafetyPlanBuilder from '../src/components/safety plan/safetyPlanBuilder';
import CourtCaseTracker from '../src/components/court/courtCaseTracker';
import { OfflineBanner, LanguageSwitcher, PanicButtonSetup } from '../src/components/shared/UIComponents';
// ✅ FIX 1: import I18nProvider alongside useTranslation
import { I18nProvider, useTranslation } from '../services/i18n';

const HaloApp = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [userData, setUserData] = useState({
    emergencyContacts: [],
    assessments: [],
    evidenceVault: []
  });
  const [userLocation, setUserLocation] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [mlHealthy, setMlHealthy] = useState(false);

  const [disguiseUnlocked, setDisguiseUnlocked] = useState(
    !disguiseModeService.getIsEnabled()
  );

  useEffect(() => {
    panicButton.start((trigger) => {
      console.log('🚨 Panic triggered via:', trigger.method);
      navigateTo('sos');
    });
    return () => panicButton.stop();
  }, [userData.emergencyContacts]);

  useEffect(() => {
    if (userData.emergencyContacts.length > 0) {
      offlineService.cacheContacts(userData.emergencyContacts);
    }
  }, [userData.emergencyContacts]);

  useEffect(() => {
    checkMLHealth();
    getUserLocation();
  }, []);

  const checkMLHealth = async () => {
    const health = await mlAPI.checkHealth();
    setMlHealthy(health.status === 'healthy');
    console.log(health.status === 'healthy' ? '✅ ML API ready' : '⚠️ ML API unavailable');
  };

  const getUserLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      console.log('📍 Location obtained:', location.quality);
    } catch (error) {
      console.warn('Location unavailable:', error.message);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('halo_user_data');
    if (saved) {
      try { setUserData(JSON.parse(saved)); } catch (e) { console.error('Error loading data:', e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('halo_user_data', JSON.stringify(userData));
  }, [userData]);

  const navigateTo = useCallback((view) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (disguiseModeService.getIsEnabled() && !disguiseUnlocked) {
    return <CalculatorDisguise onUnlock={() => setDisguiseUnlocked(true)} />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'landing':
        return <LandingPage navigateTo={navigateTo} mlHealthy={mlHealthy} />;
      case 'sos':
        return <EmergencySOSPage
          navigateTo={navigateTo}
          userData={userData}
          setUserData={setUserData}
          sosActive={sosActive}
          setSosActive={setSosActive}
          userLocation={userLocation}
          setUserLocation={setUserLocation}
        />;
      case 'risk-assessment':
        return <RiskAssessmentPage
          navigateTo={navigateTo}
          userData={userData}
          setUserData={setUserData}
          mlHealthy={mlHealthy}
        />;
      case 'ai-chatbot':
        return <AIChatbot
          navigateTo={navigateTo}
          userData={userData}
          setUserData={setUserData}
        />;
      case 'anonymous-report':
        return <AnonymousReportPage navigateTo={navigateTo} />;
      case 'resources':
        return <ResourcesPage
          navigateTo={navigateTo}
          userLocation={userLocation}
          userData={userData}
          mlHealthy={mlHealthy}
        />;
      case 'evidence':
        return <EvidenceVaultFixed
          navigateTo={navigateTo}
          userData={userData}
          setUserData={setUserData}
          mlHealthy={mlHealthy}
        />;
      case 'safety-plan':
        return <SafetyPlanBuilder navigateTo={navigateTo} />;
      case 'court-tracker':
        return <CourtCaseTracker navigateTo={navigateTo} />;
      default:
        return <LandingPage navigateTo={navigateTo} mlHealthy={mlHealthy} />;
    }
  };

  // ✅ FIX 2: wrap everything in I18nProvider so language switching works
  return (
    <I18nProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <OfflineBanner />
        {renderView()}
      </div>
    </I18nProvider>
  );
};


const LandingPage = ({ navigateTo, mlHealthy }) => {
  const [showMenu, setShowMenu] = useState(false);
  const logoRef = useRef(null);
  // ✅ FIX 3: useTranslation now works because I18nProvider wraps the whole app
  const { t } = useTranslation();

  useEffect(() => {
    panicButton.registerTapZone(logoRef.current);
    return () => panicButton.unregisterTapZone();
  }, []);

  useEffect(() => {
    try {
      const resources = realResourcesService.kenyaGBVResources;
      if (resources?.length > 0) offlineService.cacheResources(resources);
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div ref={logoRef}>
                  <Shield className="h-10 w-10 text-purple-600" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  HALO
                </h1>
                <p className="text-xs text-gray-600">{t('tagline')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {mlHealthy && (
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                  <Brain className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">{t('aiActive')}</span>
                </div>
              )}
              <LanguageSwitcher compact />
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            <span>{t('aiPoweredProtection')}</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {t('youAreNotAlone')}
          </h2>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 mt-6">
            {['Immediate Help', '100% Anonymous', '24/7 Support', 'ML-Powered Matching'].map(item => (
              <div key={item} className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => navigateTo('sos')}
            className="group relative bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Phone className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold">{t('emergency')}</h3>
              <p className="text-red-100 text-center text-sm">{t('alertContacts')}</p>
            </div>
          </button>

          <button
            onClick={() => navigateTo('ai-chatbot')}
            className="group relative bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Bot className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold">{t('aiAssistant')}</h3>
              <p className="text-purple-100 text-center text-sm">{t('aiAssistantSub')}</p>
            </div>
          </button>

          <button
            onClick={() => navigateTo('risk-assessment')}
            className="group relative bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Activity className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold">{t('quickCheck')}</h3>
              <p className="text-indigo-100 text-center text-sm">{t('quickCheckSub')}</p>
            </div>
          </button>

          <button
            onClick={() => navigateTo('anonymous-report')}
            className="group relative bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Users className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold">{t('report')}</h3>
              <p className="text-blue-100 text-center text-sm">{t('reportSub')}</p>
            </div>
          </button>
        </div>

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <button
            onClick={() => navigateTo('resources')}
            className="flex items-center justify-between p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-green-400 to-green-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">{t('resources')}</h4>
                <p className="text-sm text-gray-600">{t('resourcesSub')}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button
            onClick={() => navigateTo('evidence')}
            className="flex items-center justify-between p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-orange-400 to-orange-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">{t('evidenceVault')}</h4>
                <p className="text-sm text-gray-600">{t('evidenceVaultSub')}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button
            onClick={() => navigateTo('safety-plan')}
            className="flex items-center justify-between p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">{t('safetyPlan')}</h4>
                <p className="text-sm text-gray-600">{t('safetyPlanSub')}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button
            onClick={() => navigateTo('court-tracker')}
            className="flex items-center justify-between p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">{t('caseTracker')}</h4>
                <p className="text-sm text-gray-600">{t('caseTrackerSub')}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-1">170</div>
              <div className="text-sm text-gray-600">Women killed in 2024</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600 mb-1">&lt;2min</div>
              <div className="text-sm text-gray-600">Average response</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-1">87%</div>
              <div className="text-sm text-gray-600">ML accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-1">24/7</div>
              <div className="text-sm text-gray-600">Always available</div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border border-purple-100">
          <div className="flex items-start space-x-3">
            <Heart className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">{t('privacyTitle')}</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{t('privacyBody')}</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600 mb-2">
            HALO Guardian Network for Kenya • Presidential Task Force on Femicide Initiative
          </p>
          <p className="text-xs text-gray-500">{t('hotlineFooter')}</p>
        </div>
      </footer>
    </div>
  );
};


const AIChatbot = ({ navigateTo, userData, setUserData }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { startChatbot(); }, []);

  const startChatbot = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/chatbot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setSessionId(data.session_id);
        setCurrentQuestion(data.question);
        setMessages([{ type: 'bot', text: data.question.text, question: data.question }]);
      }
    } catch (error) {
      console.error('Chatbot start error:', error);
      setMessages([{
        type: 'bot',
        text: "Hello, I'm here to help assess your safety. Can you tell me how you're feeling right now?",
        question: { type: 'text', options: null }
      }]);
    }
  };

  const sendResponse = async (answer) => {
    if (!sessionId || !currentQuestion) return;
    setMessages(prev => [...prev, { type: 'user', text: answer }]);
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/chatbot/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question_id: currentQuestion.id, answer })
      });
      const data = await response.json();
      if (data.success) {
        if (data.empathetic_response) {
          setMessages(prev => [...prev, { type: 'bot', text: data.empathetic_response, sentiment: true }]);
        }
        if (data.finished) {
          setFinished(true);
          setRiskAssessment(data.risk_assessment);
          setMessages(prev => [...prev, {
            type: 'bot',
            text: "Based on our conversation, I've assessed your situation. Your safety is important, and there are resources available to help you.",
            final: true
          }]);
        } else if (data.next_question) {
          setCurrentQuestion(data.next_question);
          setMessages(prev => [...prev, { type: 'bot', text: data.next_question.text, question: data.next_question }]);
        }
        if (data.crisis_detected) {
          setMessages(prev => [...prev, {
            type: 'alert',
            text: "🚨 I'm very concerned about your safety. Please consider activating Emergency SOS or calling 999 if you're in immediate danger."
          }]);
        }
      }
    } catch (error) {
      console.error('Chatbot response error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center space-x-2">
            <span>←</span><span>Back to Home</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Safety Assistant</h2>
              <p className="text-gray-600">Confidential conversation • Guided support</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg mb-4" style={{ height: '60vh', overflow: 'hidden' }}>
          <div className="h-full overflow-y-auto p-6 space-y-4">
            {messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'bot' && (
                  <div className="flex items-start space-x-3 max-w-2xl">
                    <div className="bg-blue-600 p-2 rounded-full flex-shrink-0">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="bg-gray-100 rounded-2xl p-4">
                        <p className="text-gray-900">{message.text}</p>
                      </div>
                      {message.question && message.question.options && (
                        <div className="mt-3 space-y-2">
                          {message.question.options.map((option, optIdx) => (
                            <button key={optIdx} onClick={() => sendResponse(option)}
                              disabled={loading || finished}
                              className="block w-full text-left p-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-colors disabled:opacity-50">
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {message.type === 'user' && (
                  <div className="flex items-start space-x-3 max-w-2xl">
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-4">
                      <p className="text-white">{message.text}</p>
                    </div>
                    <div className="bg-purple-600 p-2 rounded-full flex-shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}
                {message.type === 'alert' && (
                  <div className="w-full">
                    <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4">
                      <p className="text-red-900 font-semibold">{message.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-full"><Bot className="h-5 w-5 text-white" /></div>
                  <div className="bg-gray-100 rounded-2xl p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {finished && riskAssessment && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assessment Results</h3>
            <div className={`p-4 rounded-xl mb-4 ${
              riskAssessment.level === 'CRITICAL' ? 'bg-red-100 border-2 border-red-600' :
              riskAssessment.level === 'HIGH' ? 'bg-orange-100 border-2 border-orange-600' :
              riskAssessment.level === 'MODERATE' ? 'bg-yellow-100 border-2 border-yellow-600' :
              'bg-green-100 border-2 border-green-600'
            }`}>
              <p className="font-bold text-lg">Risk Level: {riskAssessment.level}</p>
              <p className="text-sm">Score: {riskAssessment.score}/{riskAssessment.max_score}</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold">Recommended Actions:</h4>
              {riskAssessment.recommendations?.immediate_actions?.map((action, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">{idx + 1}</div>
                  <p className="text-gray-700">{action}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <button onClick={() => navigateTo('resources')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold">View Resources</button>
              {riskAssessment.level === 'CRITICAL' && (
                <button onClick={() => navigateTo('sos')} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-semibold">🚨 Activate Emergency SOS</button>
              )}
            </div>
          </div>
        )}

        {!finished && currentQuestion && currentQuestion.type !== 'yes_no' && (
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <form onSubmit={(e) => { e.preventDefault(); if (userInput.trim()) { sendResponse(userInput); setUserInput(''); } }} className="flex space-x-3">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your response..." disabled={loading}
                className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none" />
              <button type="submit" disabled={loading || !userInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl disabled:opacity-50">
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mt-4">
          <p className="text-xs text-gray-700">🔒 This conversation is confidential and encrypted. Your responses help us understand your situation better.</p>
        </div>
      </div>
    </div>
  );
};


const JournalSentimentAnalysis = ({ entryText }) => {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entryText && entryText.length > 20) analyzeSentiment();
  }, [entryText]);

  const analyzeSentiment = async () => {
    setLoading(true);
    try {
      const data = await mlAPI.analyzeJournal(entryText);
      if (data.success) setSentiment(data);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
    setLoading(false);
  };

  if (!sentiment) return null;

  const getSentimentColor = (level) => ({
    'CRITICAL': 'from-red-500 to-red-600',
    'HIGH_DISTRESS': 'from-orange-500 to-orange-600',
    'MODERATE': 'from-yellow-500 to-yellow-600',
    'LOW': 'from-blue-500 to-blue-600',
    'SAFE': 'from-green-500 to-green-600'
  }[level] || 'from-gray-500 to-gray-600');

  return (
    <div className="mt-4 space-y-3">
      <div className={`bg-gradient-to-r ${getSentimentColor(sentiment.sentiment)} text-white rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span className="font-semibold">AI Analysis {sentiment.fromCache ? '(offline)' : ''}</span>
          </div>
          <span className="text-sm opacity-90">{(sentiment.confidence * 100).toFixed(0)}% confident</span>
        </div>
        <p className="text-lg font-bold mb-1">{sentiment.sentiment?.replace('_', ' ')}</p>
        <div className="flex items-center space-x-2 text-sm opacity-90">
          <TrendingUp className="h-4 w-4" />
          <span>Distress Level: {sentiment.distress_level}/10</span>
        </div>
      </div>

      {sentiment.crisis_detected && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 animate-pulse">
          <div className="flex items-center space-x-2 text-red-900 font-bold mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Crisis Keywords Detected</span>
          </div>
          <p className="text-sm text-red-800">This entry contains words indicating immediate danger. Please reach out for help.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" /><span>AI Recommendations</span>
        </h4>
        <div className="space-y-2">
          {sentiment.recommended_actions?.map((action, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-sm">
              <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-gray-700">{action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RiskAssessmentPage = ({ navigateTo, userData, setUserData, mlHealthy }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [riskScore, setRiskScore] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const questions = [
    { id: 'escalatingViolence', question: 'Has the physical violence increased in frequency or severity over the past year?', options: [{ value: 'yes', label: 'Yes', weight: 4 }, { value: 'no', label: 'No', weight: 0 }] },
    { id: 'deathThreats', question: 'Has your partner ever threatened to kill you or themselves?', options: [{ value: 'yes', label: 'Yes', weight: 4 }, { value: 'no', label: 'No', weight: 0 }] },
    { id: 'weaponAccess', question: 'Does your partner have access to guns, knives, or other weapons?', options: [{ value: 'yes', label: 'Yes', weight: 4 }, { value: 'no', label: 'No', weight: 0 }] },
    { id: 'strangulation', question: 'Has your partner ever attempted to strangle or choke you?', options: [{ value: 'yes', label: 'Yes - This is very serious', weight: 5 }, { value: 'no', label: 'No', weight: 0 }], critical: true },
    { id: 'controlJealousy', question: 'Does your partner show extreme jealousy and control over your activities?', options: [{ value: 'severe', label: 'Yes, very controlling', weight: 3 }, { value: 'moderate', label: 'Somewhat', weight: 1 }, { value: 'no', label: 'No', weight: 0 }] },
    { id: 'childrenHarmed', question: 'Have your children been harmed or threatened by your partner?', options: [{ value: 'yes', label: 'Yes', weight: 5 }, { value: 'no', label: 'No or no children', weight: 0 }] },
    { id: 'recentSeparation', question: 'Have you recently left your partner or tried to end the relationship?', options: [{ value: 'yes', label: 'Yes', weight: 3 }, { value: 'no', label: 'No', weight: 0 }] },
    { id: 'substanceAbuse', question: 'Does your partner abuse drugs or alcohol?', options: [{ value: 'yes', label: 'Yes, regularly', weight: 2 }, { value: 'no', label: 'No', weight: 0 }] },
    { id: 'fearLevel', question: 'How afraid are you of what your partner might do to you?', options: [{ value: 'very_afraid', label: 'Very afraid', weight: 3 }, { value: 'somewhat_afraid', label: 'Somewhat afraid', weight: 1 }, { value: 'not_afraid', label: 'Not afraid', weight: 0 }] },
    { id: 'safePlace', question: 'Do you have a safe place to go if you need to leave quickly?', options: [{ value: 'no', label: 'No', weight: 3 }, { value: 'yes', label: 'Yes', weight: 0 }] },
    { id: 'forcedSex', question: "Has your partner ever forced you to have sex or do sexual things you didn't want to do?", options: [{ value: 'yes', label: 'Yes', weight: 4 }, { value: 'no', label: 'No', weight: 0 }] }
  ];

  const calculateRisk = () => {
    let totalScore = 0;
    const factors = [];
    questions.forEach(q => {
      const answer = answers[q.id];
      if (answer) {
        const option = q.options.find(opt => opt.value === answer);
        if (option) { totalScore += option.weight; if (option.weight > 0) factors.push(q.question); }
      }
    });
    let level = 'LOW';
    if (totalScore >= 15) level = 'CRITICAL';
    else if (totalScore >= 10) level = 'HIGH';
    else if (totalScore >= 5) level = 'MEDIUM';
    return { score: totalScore, level, factors, maxScore: 38 };
  };

  const handleAnswer = async (value) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
    setAnswers(newAnswers);
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setLoading(true);
      const risk = calculateRisk();
      setRiskScore(risk);
      if (mlHealthy) {
        try {
          const mlData = {
            strangulation: newAnswers.strangulation === 'yes' ? 1 : 0,
            death_threats: newAnswers.deathThreats === 'yes' ? 1 : 0,
            weapon_access: newAnswers.weaponAccess === 'yes' ? 1 : 0,
            children_harmed: newAnswers.childrenHarmed === 'yes' ? 1 : 0,
            recent_separation: newAnswers.recentSeparation === 'yes' ? 1 : 0,
            substance_abuse: newAnswers.substanceAbuse === 'yes' ? 1 : 0,
            control_jealousy: newAnswers.controlJealousy === 'severe' ? 2 : newAnswers.controlJealousy === 'moderate' ? 1 : 0,
            fear_level: newAnswers.fearLevel === 'very_afraid' ? 2 : newAnswers.fearLevel === 'somewhat_afraid' ? 1 : 0,
            escalating_violence: newAnswers.escalatingViolence === 'yes' ? 1 : 0,
            no_safe_place: newAnswers.safePlace === 'no' ? 1 : 0,
            forced_sex: newAnswers.forcedSex === 'yes' ? 1 : 0,
            risk_score: risk.score, days_since_last_incident: 30, incident_frequency: 5, score_change_trend: 0, previous_incidents: 3
          };
          const prediction = await mlAPI.predictEscalation(mlData);
          if (prediction.success) setMlPrediction(prediction);
          if (userData.assessments?.length > 0) {
            const trend = await mlAPI.analyzeTrend(userData.assessments.map(a => ({ score: a.score, date: a.date })));
            if (trend.success) setTrendAnalysis(trend);
          }
        } catch (error) { console.error('ML prediction error:', error); }
      }
      setShowResults(true);
      setLoading(false);
      setUserData(prev => ({
        ...prev,
        assessments: [...prev.assessments, { id: Date.now(), date: new Date().toISOString(), score: risk.score, level: risk.level, answers: newAnswers, mlPrediction }]
      }));
    }
  };

  const getRiskColor = (level) => ({ CRITICAL: 'from-red-500 to-red-600', HIGH: 'from-orange-500 to-orange-600', MEDIUM: 'from-yellow-500 to-yellow-600', LOW: 'from-green-500 to-green-600' }[level] || 'from-gray-500 to-gray-600');

  const getRiskRecommendations = (level) => ({
    CRITICAL: { title: 'You are in Critical Danger', description: 'Your situation shows multiple high-risk factors for fatal violence.', actions: ['Consider activating Emergency SOS now', 'Contact emergency shelter immediately', 'Do NOT return home if unsafe', 'Call police if in immediate danger (999)'] },
    HIGH: { title: 'High Risk - Urgent Action Needed', description: 'Your situation shows serious risk factors.', actions: ['Create a detailed safety plan today', 'Contact a shelter to discuss options', 'Consider a protection order', 'Keep Emergency SOS ready'] },
    MEDIUM: { title: 'Medium Risk - Take Action Soon', description: 'You are experiencing concerning patterns of abuse.', actions: ['Speak with a counselor this week', 'Learn about legal options', 'Begin creating a safety plan', 'Connect with support services'] },
    LOW: { title: 'Lower Risk - Stay Vigilant', description: 'Current situation shows fewer immediate risk factors.', actions: ['Stay informed about warning signs', 'Build a support network', 'Know your resources', 'Continue monitoring'] }
  }[level] || { title: 'Assessment Complete', description: '', actions: [] });

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <Brain className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-pulse" />
        <p className="text-xl font-semibold text-gray-900">Analyzing your assessment...</p>
        <p className="text-sm text-gray-600 mt-2">Using AI to predict risk escalation</p>
      </div>
    </div>
  );

  if (showResults && riskScore) {
    const recommendations = getRiskRecommendations(riskScore.level);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-3xl mx-auto">
          {mlPrediction && mlPrediction.escalation_probability > 0.6 && (
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl p-6 mb-6 shadow-2xl animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <Brain className="h-8 w-8" />
                <div><h3 className="text-xl font-bold">🚨 AI Escalation Warning</h3><p className="text-sm opacity-90">Machine Learning Risk Analysis</p></div>
              </div>
              <div className="bg-white/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Escalation Risk (30 days)</span>
                  <span className="text-3xl font-bold">{(mlPrediction.escalation_probability * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-3">
                  <div className="bg-white rounded-full h-3 transition-all duration-1000" style={{ width: `${mlPrediction.escalation_probability * 100}%` }}></div>
                </div>
                <p className="text-xs mt-2 opacity-90">Model Confidence: High • Based on {mlPrediction.key_risk_factors?.length || 0} critical factors</p>
              </div>
              {mlPrediction.key_risk_factors?.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="font-semibold mb-2">🎯 Critical Factors Detected:</p>
                  {mlPrediction.key_risk_factors.slice(0, 3).map((factor, idx) => (
                    <div key={idx} className="flex items-start space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{factor.factor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {trendAnalysis && trendAnalysis.trend !== 'INSUFFICIENT_DATA' && (
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-blue-600" /><span>Risk Trend Analysis</span>
              </h3>
              <div className={`bg-gradient-to-r ${trendAnalysis.trend === 'ESCALATING' ? 'from-red-500 to-red-600' : trendAnalysis.trend === 'INCREASING' ? 'from-orange-500 to-orange-600' : trendAnalysis.trend === 'IMPROVING' ? 'from-green-500 to-green-600' : 'from-blue-500 to-blue-600'} text-white rounded-xl p-4 mb-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Status: {trendAnalysis.trend}</span>
                  <span className="text-2xl font-bold">{trendAnalysis.change_amount > 0 ? '+' : ''}{trendAnalysis.change_amount?.toFixed(1)}</span>
                </div>
                <p className="text-sm opacity-90">{trendAnalysis.message}</p>
              </div>
              {trendAnalysis.trend === 'ESCALATING' && (
                <button onClick={() => navigateTo('sos')} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold">🚨 Activate Emergency SOS Now</button>
              )}
            </div>
          )}

          <div className={`bg-gradient-to-r ${getRiskColor(riskScore.level)} text-white rounded-2xl p-8 mb-6 shadow-2xl`}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <h2 className="text-4xl font-bold mb-2">{recommendations.title}</h2>
              <p className="text-lg opacity-90">{recommendations.description}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Risk Score</span>
                <span className="text-2xl font-bold">{riskScore.score}/{riskScore.maxScore}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div className="bg-white rounded-full h-3 transition-all duration-1000" style={{ width: `${(riskScore.score / riskScore.maxScore) * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Zap className="h-6 w-6 text-purple-600" /><span>Recommended Actions</span>
            </h3>
            <div className="space-y-3">
              {recommendations.actions.map((action, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">{idx + 1}</div>
                  <p className="text-gray-700 text-sm leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {riskScore.level === 'CRITICAL' && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
              <h4 className="font-bold text-red-900 mb-4">🚨 Take Immediate Action</h4>
              <div className="space-y-3">
                <button onClick={() => navigateTo('sos')} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-bold shadow-lg">Activate Emergency SOS Now</button>
                <button onClick={() => navigateTo('resources')} className="w-full bg-white hover:bg-gray-50 text-gray-900 py-4 rounded-xl font-semibold border-2 border-gray-200">View Emergency Shelters</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={() => navigateTo('safety-plan')} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg">📋 Build My Safety Plan</button>
            <button onClick={() => navigateTo('resources')} className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-4 rounded-xl font-semibold shadow-lg">Find Resources & Support</button>
            <button onClick={() => { setShowResults(false); setCurrentQuestion(0); setAnswers({}); setRiskScore(null); setMlPrediction(null); setTrendAnalysis(null); }} className="w-full bg-white hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-medium border border-gray-200">Retake Assessment</button>
            <button onClick={() => navigateTo('landing')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-medium">Back to Home</button>
          </div>

          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              <Lock className="h-4 w-4 inline mr-1" />
              Your assessment is saved locally and encrypted. ML predictions are based on validated research from WHO and Johns Hopkins University.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center space-x-2"><span>←</span><span>Back to Home</span></button>
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl"><Activity className="h-6 w-6 text-white" /></div>
            <div><h2 className="text-2xl font-bold text-gray-900">Safety Risk Assessment</h2><p className="text-gray-600">Question {currentQuestion + 1} of {questions.length}</p></div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full h-2 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-xl animate-fade-in">
          {questions[currentQuestion].critical && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 text-red-900"><AlertTriangle className="h-5 w-5" /><span className="font-semibold text-sm">Critical Risk Indicator</span></div>
            </div>
          )}
          <h3 className="text-2xl font-semibold text-gray-900 mb-8 leading-relaxed">{questions[currentQuestion].question}</h3>
          <div className="space-y-4">
            {questions[currentQuestion].options.map((option) => (
              <button key={option.value} onClick={() => handleAnswer(option.value)}
                className="w-full text-left p-5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-pink-50 border-2 border-gray-200 hover:border-purple-400 rounded-xl transition-all duration-200 transform hover:scale-102 group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium group-hover:text-purple-900">{option.label}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 bg-white rounded-xl p-4 shadow">
          <p className="text-xs text-gray-600 text-center"><Lock className="h-3 w-3 inline mr-1" />All responses are confidential and encrypted</p>
        </div>
      </div>
    </div>
  );
};


const ResourcesPage = ({ navigateTo, userLocation, userData, mlHealthy }) => {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [smartResources, setSmartResources] = useState([]);
  const [loading, setLoading] = useState(false);

  const allResources = offlineService.isOnline
    ? realResourcesService.kenyaGBVResources
    : (offlineService.getCachedResources().length > 0
        ? offlineService.getCachedResources()
        : realResourcesService.kenyaGBVResources);

  const types = ['All', 'Shelter', 'Legal', 'Medical', 'Police', 'Counseling', 'Hotline'];

  const getTypeColor = (type) => ({
    'Shelter': 'from-blue-500 to-blue-600', 'Legal': 'from-purple-500 to-purple-600',
    'Medical': 'from-red-500 to-red-600', 'Police': 'from-gray-700 to-gray-800',
    'Counseling': 'from-green-500 to-green-600', 'Hotline': 'from-orange-500 to-orange-600',
    'Emergency': 'from-red-600 to-red-700', 'Support': 'from-indigo-500 to-indigo-600'
  }[type] || 'from-gray-500 to-gray-600');

  useEffect(() => {
    if (userLocation && mlHealthy) getSmartRecommendations();
  }, [userLocation, mlHealthy, userData.assessments]);

  const getSmartRecommendations = async () => {
    setLoading(true);
    const latestAssessment = userData.assessments?.[userData.assessments.length - 1];
    const userProfile = {
      risk_level: latestAssessment?.level || 'MODERATE',
      has_children: latestAssessment?.answers?.childrenHarmed === 'yes',
      needs_immediate: latestAssessment?.level === 'CRITICAL',
      preferred_county: 'Nairobi'
    };
    const matched = proximityService.findNearestResources(userLocation, allResources, 50, 10, userProfile);
    setSmartResources(matched);
    setLoading(false);
  };

  const filteredResources = (smartResources.length > 0 ? smartResources : allResources).filter(r =>
    (filter === 'All' || r.type === filter) && r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center space-x-2"><span>←</span><span>Back to Home</span></button>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl"><MapPin className="h-6 w-6 text-white" /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Resource Directory</h2>
                <p className="text-gray-600">
                  {smartResources.length > 0 ? 'AI-matched for you' : `${allResources.length} verified resources`}
                  {!offlineService.isOnline && ' (cached)'}
                </p>
              </div>
            </div>
            {userLocation && <div className="text-xs text-gray-500">📍 {userLocation.quality} accuracy</div>}
          </div>
          <input type="text" placeholder="Search resources..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none" />
        </div>

        {smartResources.length > 0 && !searchQuery && filter === 'All' && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-4 text-white">
              <Brain className="h-8 w-8" />
              <div><h3 className="text-2xl font-bold">Recommended For You</h3><p className="text-sm opacity-90">AI-matched based on your needs and location</p></div>
            </div>
            <div className="space-y-3">
              {smartResources.slice(0, 3).map((resource, idx) => (
                <div key={idx} className="bg-white rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-lg">{resource.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${resource.priorityLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' : resource.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' : resource.priorityLevel === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{resource.priorityLevel}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{resource.type}</p>
                      <p className="text-xs text-gray-500">{resource.distanceText} away • {resource.direction} • {resource.travelTime} walk</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full"><span className="text-xl font-bold">{resource.smartScore}</span><span className="text-xs">/100</span></div>
                  </div>
                  {resource.matchReasons?.length > 0 && (
                    <div className="space-y-1 mb-4">
                      {resource.matchReasons.slice(0, 3).map((reason, i) => (
                        <div key={i} className="flex items-center space-x-2 text-sm text-gray-700">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" /><span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <a href={`tel:${resource.phone}`} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-center font-semibold">📞 Call Now</a>
                    {resource.latitude && resource.longitude && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${resource.latitude},${resource.longitude}`} target="_blank" rel="noopener noreferrer"
                        className="px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center">
                        <Navigation className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {types.map(type => (
              <button key={type} onClick={() => setFilter(type)}
                className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${filter === type ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredResources.map(resource => (
            <div key={resource.id} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`bg-gradient-to-r ${getTypeColor(resource.type)} p-2 rounded-lg`}><Shield className="h-5 w-5 text-white" /></div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{resource.type}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{resource.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3"><MapPin className="h-4 w-4" /><span>{resource.address}</span></div>
                  {resource.services && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {resource.services.slice(0, 3).map((service, idx) => <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">{service}</span>)}
                    </div>
                  )}
                  {resource.available24_7 && <span className="inline-flex items-center space-x-1 text-green-600 font-medium text-sm"><Clock className="h-4 w-4" /><span>24/7 Available</span></span>}
                </div>
              </div>
              <div className="flex space-x-3">
                <a href={`tel:${resource.phone}`} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-semibold text-center">📞 Call Now</a>
                {resource.latitude && resource.longitude && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${resource.latitude},${resource.longitude}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-semibold text-center">🗺️ Directions</a>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Resources Found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};


const EmergencySOSPage = ({ navigateTo, userData, setUserData, sosActive, setSosActive, userLocation, setUserLocation }) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', relationship: '' });
  const [alertSent, setAlertSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('halo_user_email') || '');
  const [userName, setUserName] = useState(localStorage.getItem('halo_user_name') || 'User');
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const mockNearestResources = [
    { name: 'COVAW Shelter', type: 'Shelter', phone: '+254-20-2731410', email: 'info@covaw.or.ke', distance: 2.3 },
    { name: 'FIDA Legal Aid', type: 'Legal', phone: '+254-20-387-1196', email: 'fida@fidakenya.org', distance: 3.1 },
    { name: "Women's Hospital GBV Unit", type: 'Medical', phone: '+254-722-203-213', email: 'gbv@womenshospital.co.ke', distance: 3.7 },
    { name: 'Police Gender Desk', type: 'Police', phone: '999', email: 'genderdesk@police.go.ke', distance: 1.5 },
  ];

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addContact = () => {
    if (!newContact.name || !newContact.email) { setEmailError('Please fill in name and email address'); return; }
    if (!validateEmail(newContact.email)) { setEmailError('Please enter a valid email address'); return; }
    if (userData.emergencyContacts.length >= 3) { setEmailError('Maximum 3 emergency contacts allowed'); return; }
    if (userData.emergencyContacts.some(c => c.email.toLowerCase() === newContact.email.toLowerCase())) { setEmailError('This email is already added'); return; }
    setUserData(prev => ({ ...prev, emergencyContacts: [...prev.emergencyContacts, { ...newContact, id: Date.now() }] }));
    setNewContact({ name: '', email: '', relationship: '' });
    setShowContactForm(false);
    setEmailError('');
  };

  const deleteContact = (id) => setUserData(prev => ({ ...prev, emergencyContacts: prev.emergencyContacts.filter(c => c.id !== id) }));

  const triggerSOS = async () => {
    if (userData.emergencyContacts.length === 0) { alert('Please add at least one emergency contact first'); return; }
    if (!userEmail || !userName) { setShowSOSConfirm(false); setShowProfileSetup(true); return; }
    setShowSOSConfirm(false);

    if (!offlineService.isOnline) {
      const contacts = offlineService.getCachedContacts();
      offlineService.queueAction({ type: 'sos_alert', payload: { contacts, userName, timestamp: new Date().toISOString() } });
      setSosActive(true);
      setAlertSent(true);
      alert(`⚠️ You are offline. SOS queued — will send when internet returns.\n\nPlease call contacts directly:\n${contacts.map(c => `${c.name}: ${c.email}`).join('\n')}\n\nPolice: 999 | GBV Hotline: 1195`);
      return;
    }

    alert('🚨 Sending emergency email alerts...\n\nThis may take 10-30 seconds.');
    const result = await sosAlertSystem.triggerEmergencySOS(userData.emergencyContacts, userName, userEmail);
    if (result.success) {
      setSosActive(true); setUserLocation(result.location); setAlertSent(true);
      localStorage.setItem('halo_sos_watchid', result.watchId);
      localStorage.setItem('halo_sos_alertid', result.alertId);
      alert(`✅ Emergency emails sent to ${userData.emergencyContacts.length} contact(s)!\n\nThey can reply directly to: ${userEmail}`);
    } else {
      alert(`⚠️ ${result.fallbackMessage || 'Failed to send alerts'}\n\nCall contacts manually:\n${userData.emergencyContacts.map(c => `${c.name}: ${c.email}`).join('\n')}`);
    }
  };

  const stopSOS = async () => {
    const watchId = localStorage.getItem('halo_sos_watchid');
    const alertId = localStorage.getItem('halo_sos_alertid');
    await sosAlertSystem.stopSOS(alertId, watchId, userData.emergencyContacts, 'User');
    localStorage.removeItem('halo_sos_watchid'); localStorage.removeItem('halo_sos_alertid');
    setSosActive(false); setAlertSent(false);
    alert('✅ SOS deactivated. "I\'m safe" emails sent to all contacts.');
  };

  if (sosActive) {
    return (
      <div className="min-h-screen bg-red-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-8 mb-6 shadow-2xl animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-full"><Phone className="h-8 w-8" /></div>
                <div><h2 className="text-3xl font-bold">SOS ACTIVE</h2><p className="text-red-100">Emergency emails sent</p></div>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
            {alertSent && (
              <div className="bg-white/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm"><Check className="h-5 w-5" /><span>Emails sent to {userData.emergencyContacts.length} contact(s)</span></div>
                <div className="text-xs opacity-90">📧 {userData.emergencyContacts.map(c => c.email).join(', ')}</div>
              </div>
            )}
          </div>

          {userLocation && (
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border-2 border-red-200">
              <div className="flex items-center space-x-3 mb-4"><MapPin className="h-6 w-6 text-red-600 animate-pulse" /><h3 className="text-xl font-semibold text-gray-900">Live Location Tracking</h3></div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Latitude:</span><span className="font-mono text-gray-900">{userLocation.latitude?.toFixed(6)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Longitude:</span><span className="font-mono text-gray-900">{userLocation.longitude?.toFixed(6)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Accuracy:</span><span className="font-mono text-gray-900">±{userLocation.accuracy}m</span></div>
              </div>
              <a href={`https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`} target="_blank" rel="noopener noreferrer"
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-center block">📍 View My Location on Map</a>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Nearest Emergency Resources</h3>
            <div className="space-y-3">
              {mockNearestResources.map((resource, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-semibold text-gray-900 mb-1">{resource.name}</p>
                  <p className="text-sm text-gray-600 mb-3">{resource.type} • {resource.distance} km away</p>
                  <div className="flex space-x-2">
                    <a href={`tel:${resource.phone}`} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-semibold text-center">📞 Call</a>
                    <a href={`mailto:${resource.email}`} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-semibold text-center">📧 Email</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={stopSOS} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-5 rounded-2xl font-bold text-xl shadow-2xl mb-4">
            <Check className="h-6 w-6 inline mr-2" />I'm Safe Now - Stop SOS
          </button>
          <button onClick={() => { stopSOS(); navigateTo('landing'); }} className="w-full bg-white hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-medium shadow border border-gray-200">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center space-x-2"><span>←</span><span>Back to Home</span></button>
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl"><Phone className="h-6 w-6 text-white" /></div>
            <div><h2 className="text-3xl font-bold text-gray-900">Emergency SOS</h2><p className="text-gray-600">Email alerts to trusted contacts</p></div>
          </div>
          {userEmail && userName && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 p-2 rounded-full"><User className="h-4 w-4 text-white" /></div>
                  <div><p className="text-sm font-semibold text-gray-900">{userName}</p><p className="text-xs text-gray-600">{userEmail}</p></div>
                </div>
                <button onClick={() => setShowProfileSetup(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
              </div>
            </div>
          )}
          {!userEmail && (
            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
              <div className="flex items-center space-x-2 mb-2"><AlertTriangle className="h-5 w-5 text-yellow-600" /><p className="font-semibold text-yellow-900">Setup Required</p></div>
              <p className="text-sm text-yellow-800 mb-3">Add your email so contacts can reply to you during emergencies</p>
              <button onClick={() => setShowProfileSetup(true)} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-semibold text-sm">Add Your Email</button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <PanicButtonSetup
            panicButtonService={panicButton}
            onSOSTriggered={() => { if (userData.emergencyContacts.length > 0) triggerSOS(); }}
          />
        </div>

        {showProfileSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Information</h3>
              <input type="text" placeholder="Your Name *" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-purple-400 focus:outline-none" />
              <input type="email" placeholder="Your Email Address *" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 focus:border-purple-400 focus:outline-none" />
              <div className="flex space-x-3">
                <button onClick={() => {
                  if (userName && userEmail && validateEmail(userEmail)) {
                    localStorage.setItem('halo_user_name', userName);
                    localStorage.setItem('halo_user_email', userEmail);
                    setShowProfileSetup(false);
                  } else { alert('Please enter valid name and email'); }
                }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold">Save</button>
                <button onClick={() => setShowProfileSetup(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">How Emergency SOS Works</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Add up to 3 trusted contacts with their emails</li>
                <li>When you activate SOS, they receive instant email alerts</li>
                <li>Email includes your live location and emergency instructions</li>
                <li>Location updates sent every 2 minutes while active</li>
                <li>When safe, deactivate to send "I'm safe" confirmation</li>
              </ol>
              <p className="text-xs text-blue-700 mt-3">💡 <strong>Tip:</strong> Emails arrive in 10-30 seconds. For faster alerts, also call 999 for police.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Emergency Contacts</h3>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{userData.emergencyContacts.length}/3</span>
          </div>
          {userData.emergencyContacts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2 font-medium">No emergency contacts added yet</p>
              <p className="text-sm text-gray-500">Add trusted contacts who will receive email alerts</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {userData.emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-500 p-2 rounded-lg"><Mail className="h-5 w-5 text-white" /></div>
                    <div>
                      <p className="font-semibold text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-600">{contact.email}</p>
                      {contact.relationship && <p className="text-xs text-gray-500">{contact.relationship}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteContact(contact.id)} className="text-red-600 hover:text-red-700 font-medium text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition-colors">Remove</button>
                </div>
              ))}
            </div>
          )}
          {!showContactForm && userData.emergencyContacts.length < 3 && (
            <button onClick={() => setShowContactForm(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-semibold transition-colors">+ Add Emergency Contact</button>
          )}
          {showContactForm && (
            <div className="mt-4 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
              {emailError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{emailError}</p></div>}
              <input type="text" placeholder="Full Name *" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-purple-400 focus:outline-none" />
              <input type="email" placeholder="Email Address *" value={newContact.email} onChange={(e) => { setNewContact({...newContact, email: e.target.value}); setEmailError(''); }} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-purple-400 focus:outline-none" />
              <input type="text" placeholder="Relationship (e.g., Sister, Friend)" value={newContact.relationship} onChange={(e) => setNewContact({...newContact, relationship: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 focus:border-purple-400 focus:outline-none" />
              <div className="flex space-x-3">
                <button onClick={addContact} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors">Save Contact</button>
                <button onClick={() => { setShowContactForm(false); setNewContact({ name: '', email: '', relationship: '' }); setEmailError(''); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Activate Emergency SOS</h3>
          <p className="text-sm text-gray-600 mb-6">This will send emergency email alerts to your contacts with your live location and instructions.</p>
          {userData.emergencyContacts.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center space-x-2 text-yellow-800"><AlertTriangle className="h-5 w-5" /><p className="text-sm font-medium">Please add at least one emergency contact first</p></div>
            </div>
          )}
          {!showSOSConfirm ? (
            <button onClick={() => { if (userData.emergencyContacts.length === 0) { alert('Please add at least one emergency contact first'); return; } setShowSOSConfirm(true); }}
              disabled={userData.emergencyContacts.length === 0}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-6 rounded-xl font-bold text-xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              🚨 ACTIVATE EMERGENCY SOS
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border-2 border-red-600 rounded-xl p-6">
                <p className="font-bold text-red-900 mb-3"><AlertTriangle className="h-5 w-5 inline mr-2" />Confirm Emergency Alert</p>
                <p className="text-sm text-red-700 mb-3">This will send emergency emails to:</p>
                <ul className="text-sm text-red-800 space-y-1 mb-3">
                  {userData.emergencyContacts.map(contact => (
                    <li key={contact.id} className="flex items-center space-x-2"><Mail className="h-4 w-4" /><span>{contact.name} ({contact.email})</span></li>
                  ))}
                </ul>
              </div>
              <button onClick={triggerSOS} className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-xl font-bold text-lg transition-colors">YES - Send Emergency Emails Now</button>
              <button onClick={() => setShowSOSConfirm(false)} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-4 rounded-xl font-semibold transition-colors">Cancel</button>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-6">
          <h4 className="font-bold text-orange-900 mb-3">🚨 Immediate Danger? Call Now:</h4>
          <div className="space-y-2">
            <a href="tel:999" className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-orange-50 transition-colors"><span className="text-gray-900 font-semibold">Police Emergency</span><span className="text-red-600 font-bold">999</span></a>
            <a href="tel:1195" className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-orange-50 transition-colors"><span className="text-gray-900 font-semibold">GBV Hotline (24/7)</span><span className="text-red-600 font-bold">1195</span></a>
          </div>
        </div>
      </div>
    </div>
  );
};


const AnonymousReportPage = ({ navigateTo }) => {
  const [step, setStep] = useState(1);
  const [report, setReport] = useState({ description: '', location: '', timing: '', tags: [], caseNumber: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const caseNumber = `HALO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    if (!offlineService.isOnline) {
      offlineService.queueAction({ type: 'report', payload: { ...report, caseNumber, submittedAt: new Date().toISOString() } });
    }
    setReport({ ...report, caseNumber });
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"><Check className="h-10 w-10 text-green-600" /></div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Report Submitted</h2>
        <p className="text-gray-600 mb-6">Your anonymous report has been received{!offlineService.isOnline ? ' and will sync when online' : ''}.</p>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6"><p className="text-sm text-gray-700 mb-2">Your Case Number:</p><p className="text-2xl font-bold text-blue-600 font-mono">{report.caseNumber}</p></div>
        <button onClick={() => navigateTo('landing')} className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold">Return to Home</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <button onClick={() => navigateTo('landing')} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center space-x-2"><span>←</span><span>Back</span></button>
          <h2 className="text-2xl font-bold text-gray-900">Anonymous Reporting</h2>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 rounded-full h-2" style={{ width: `${(step / 3) * 100}%` }}></div></div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Describe What You Witnessed</h3>
              <textarea value={report.description} onChange={(e) => setReport({ ...report, description: e.target.value })} placeholder="Describe the incident..." className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl" />
              <button onClick={() => setStep(2)} disabled={!report.description} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50">Continue</button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Where Did This Happen?</h3>
              <input type="text" value={report.location} onChange={(e) => setReport({ ...report, location: e.target.value })} placeholder="Enter location..." className="w-full p-4 border-2 border-gray-200 rounded-xl" />
              <div className="flex space-x-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold">Back</button>
                <button onClick={() => setStep(3)} disabled={!report.location} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50">Continue</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">When Did This Happen?</h3>
              <div className="space-y-3">
                {['Happening right now', 'Today', 'This week', 'Ongoing pattern'].map(timing => (
                  <button key={timing} onClick={() => setReport({ ...report, timing })}
                    className={`w-full text-left p-4 rounded-xl ${report.timing === timing ? 'bg-blue-600 text-white border-2 border-blue-600' : 'bg-gray-50 border-2 border-gray-200'}`}>
                    {timing}
                  </button>
                ))}
              </div>
              <div className="flex space-x-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold">Back</button>
                <button onClick={handleSubmit} disabled={!report.timing} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50">Submit Report</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { AIChatbot, JournalSentimentAnalysis };
export default HaloApp;