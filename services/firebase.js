import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getDatabase, ref as dbRef, set, onValue, off, push } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://demo.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Set auth persistence
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const emergencyContactsService = {
  // Add emergency contact
  async addContact(userId, contact) {
    try {
      const contactsRef = collection(db, 'users', userId, 'emergencyContacts');
      const docRef = await addDoc(contactsRef, {
        ...contact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding contact:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all contacts
  async getContacts(userId) {
    try {
      const contactsRef = collection(db, 'users', userId, 'emergencyContacts');
      const snapshot = await getDocs(contactsRef);
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, contacts };
    } catch (error) {
      console.error('Error getting contacts:', error);
      return { success: false, contacts: [], error: error.message };
    }
  },

  // Update contact
  async updateContact(userId, contactId, updates) {
    try {
      const contactRef = doc(db, 'users', userId, 'emergencyContacts', contactId);
      await updateDoc(contactRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating contact:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete contact
  async deleteContact(userId, contactId) {
    try {
      const contactRef = doc(db, 'users', userId, 'emergencyContacts', contactId);
      await deleteDoc(contactRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting contact:', error);
      return { success: false, error: error.message };
    }
  }
};



export const sosService = {
  // Create SOS alert
  async createAlert(userId, alertData) {
    try {
      const alertsRef = collection(db, 'sosAlerts');
      const docRef = await addDoc(alertsRef, {
        userId,
        ...alertData,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, alertId: docRef.id };
    } catch (error) {
      console.error('Error creating alert:', error);
      return { success: false, error: error.message };
    }
  },

  // Update alert status
  async updateAlertStatus(alertId, status) {
    try {
      const alertRef = doc(db, 'sosAlerts', alertId);
      await updateDoc(alertRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating alert:', error);
      return { success: false, error: error.message };
    }
  },

  // Track location in realtime
  async startLocationTracking(alertId, location) {
    try {
      const locationRef = dbRef(realtimeDb, `sosAlerts/${alertId}/location`);
      await set(locationRef, {
        ...location,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error tracking location:', error);
      return { success: false, error: error.message };
    }
  },

  // Listen to location updates
  subscribeToLocation(alertId, callback) {
    const locationRef = dbRef(realtimeDb, `sosAlerts/${alertId}/location`);
    onValue(locationRef, (snapshot) => {
      const location = snapshot.val();
      callback(location);
    });
    return () => off(locationRef);
  }
};



export const resourcesService = {
  // Add resource
  async addResource(resource) {
    try {
      const resourcesRef = collection(db, 'resources');
      const docRef = await addDoc(resourcesRef, {
        ...resource,
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding resource:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all resources
  async getResources(filters = {}) {
    try {
      let resourcesRef = collection(db, 'resources');
      let q = resourcesRef;

      // Apply filters
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.verified !== undefined) {
        q = query(q, where('verified', '==', filters.verified));
      }

      const snapshot = await getDocs(q);
      const resources = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, resources };
    } catch (error) {
      console.error('Error getting resources:', error);
      return { success: false, resources: [], error: error.message };
    }
  },

  // Get resource by ID
  async getResourceById(resourceId) {
    try {
      const resourceRef = doc(db, 'resources', resourceId);
      const snapshot = await getDoc(resourceRef);
      if (snapshot.exists()) {
        return { success: true, resource: { id: snapshot.id, ...snapshot.data() } };
      }
      return { success: false, error: 'Resource not found' };
    } catch (error) {
      console.error('Error getting resource:', error);
      return { success: false, error: error.message };
    }
  },

  // Update resource
  async updateResource(resourceId, updates) {
    try {
      const resourceRef = doc(db, 'resources', resourceId);
      await updateDoc(resourceRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating resource:', error);
      return { success: false, error: error.message };
    }
  }
};


export const riskAssessmentService = {
  // Save assessment
  async saveAssessment(userId, assessment) {
    try {
      const assessmentsRef = collection(db, 'users', userId, 'assessments');
      const docRef = await addDoc(assessmentsRef, {
        ...assessment,
        createdAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving assessment:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user assessments
  async getAssessments(userId, limitCount = 10) {
    try {
      const assessmentsRef = collection(db, 'users', userId, 'assessments');
      const q = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      const assessments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, assessments };
    } catch (error) {
      console.error('Error getting assessments:', error);
      return { success: false, assessments: [], error: error.message };
    }
  }
};


export const reportsService = {
  // Submit anonymous report
  async submitReport(report) {
    try {
      const reportsRef = collection(db, 'anonymousReports');
      const caseNumber = `HALO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const docRef = await addDoc(reportsRef, {
        ...report,
        caseNumber,
        status: 'pending',
        urgency: report.urgencyScore || 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return { success: true, caseNumber, id: docRef.id };
    } catch (error) {
      console.error('Error submitting report:', error);
      return { success: false, error: error.message };
    }
  },

  // Get report by case number
  async getReportByCaseNumber(caseNumber) {
    try {
      const reportsRef = collection(db, 'anonymousReports');
      const q = query(reportsRef, where('caseNumber', '==', caseNumber));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { success: true, report: { id: doc.id, ...doc.data() } };
      }
      return { success: false, error: 'Report not found' };
    } catch (error) {
      console.error('Error getting report:', error);
      return { success: false, error: error.message };
    }
  },

  // Update report status (for admin/NGO)
  async updateReportStatus(reportId, status, notes) {
    try {
      const reportRef = doc(db, 'anonymousReports', reportId);
      await updateDoc(reportRef, {
        status,
        notes,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating report:', error);
      return { success: false, error: error.message };
    }
  }
};


export const evidenceService = {
  // Upload evidence file (photo/audio)
  async uploadEvidence(userId, file, metadata) {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `evidence/${userId}/${fileName}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        customMetadata: metadata
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Save metadata to Firestore
      const evidenceRef = collection(db, 'users', userId, 'evidence');
      const docRef = await addDoc(evidenceRef, {
        fileName,
        fileType: file.type,
        fileSize: file.size,
        downloadURL,
        metadata,
        createdAt: new Date().toISOString()
      });
      
      return { success: true, id: docRef.id, downloadURL };
    } catch (error) {
      console.error('Error uploading evidence:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all evidence
  async getEvidence(userId) {
    try {
      const evidenceRef = collection(db, 'users', userId, 'evidence');
      const q = query(evidenceRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const evidence = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, evidence };
    } catch (error) {
      console.error('Error getting evidence:', error);
      return { success: false, evidence: [], error: error.message };
    }
  },

  // Delete evidence
  async deleteEvidence(userId, evidenceId, fileName) {
    try {
      // Delete from storage
      const storageRef = ref(storage, `evidence/${userId}/${fileName}`);
      await deleteObject(storageRef);
      
      // Delete from Firestore
      const evidenceRef = doc(db, 'users', userId, 'evidence', evidenceId);
      await deleteDoc(evidenceRef);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting evidence:', error);
      return { success: false, error: error.message };
    }
  },

  // Save journal entry
  async saveJournalEntry(userId, entry) {
    try {
      const journalRef = collection(db, 'users', userId, 'journal');
      const docRef = await addDoc(journalRef, {
        ...entry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return { success: false, error: error.message };
    }
  },

  // Get journal entries
  async getJournalEntries(userId) {
    try {
      const journalRef = collection(db, 'users', userId, 'journal');
      const q = query(journalRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, entries };
    } catch (error) {
      console.error('Error getting journal entries:', error);
      return { success: false, entries: [], error: error.message };
    }
  }
};


export const authService = {
  // Anonymous sign in (for privacy)
  async signInAnonymous() {
    try {
      const userCredential = await signInAnonymously(auth);
      return { success: true, userId: userCredential.user.uid };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return auth.currentUser !== null;
  }
};

export default {
  emergencyContactsService,
  sosService,
  resourcesService,
  riskAssessmentService,
  reportsService,
  evidenceService,
  authService
};