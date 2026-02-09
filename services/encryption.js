export const encryptionService = {
  /**
   * Generate encryption key from password/PIN
   */
  async generateKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive encryption key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  },

  /**
   * Generate random salt
   */
  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  },

  /**
   * Generate random IV (Initialization Vector)
   */
  generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
  },

  /**
   * Encrypt data using AES-256-GCM
   */
  async encryptData(data, password) {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = await this.generateKey(password, salt);

      const encoder = new TextEncoder();
      const dataBuffer = typeof data === 'string' 
        ? encoder.encode(data)
        : data;

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        dataBuffer
      );

      // Combine salt + iv + encrypted data
      const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);

      return {
        success: true,
        encrypted: this.arrayBufferToBase64(result),
        algorithm: 'AES-256-GCM'
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Decrypt data using AES-256-GCM
   */
  async decryptData(encryptedBase64, password) {
    try {
      const encryptedData = this.base64ToArrayBuffer(encryptedBase64);
      
      // Extract salt, iv, and encrypted content
      const salt = encryptedData.slice(0, 16);
      const iv = encryptedData.slice(16, 28);
      const encrypted = encryptedData.slice(28);

      const key = await this.generateKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return {
        success: true,
        decrypted: decoder.decode(decrypted)
      };
    } catch (error) {
      console.error('Decryption error:', error);
      return { success: false, error: 'Decryption failed. Wrong password or corrupted data.' };
    }
  },

  /**
   * Encrypt file (for photos, audio recordings)
   */
  async encryptFile(file, password) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = await this.generateKey(password, salt);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        arrayBuffer
      );

      // Create encrypted blob with metadata
      const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);

      const encryptedBlob = new Blob([result], { type: 'application/octet-stream' });

      return {
        success: true,
        encryptedFile: encryptedBlob,
        originalName: file.name,
        originalType: file.type,
        originalSize: file.size,
        encryptedSize: encryptedBlob.size
      };
    } catch (error) {
      console.error('File encryption error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Decrypt file
   */
  async decryptFile(encryptedBlob, password, originalType = 'application/octet-stream') {
    try {
      const arrayBuffer = await encryptedBlob.arrayBuffer();
      const encryptedData = new Uint8Array(arrayBuffer);

      const salt = encryptedData.slice(0, 16);
      const iv = encryptedData.slice(16, 28);
      const encrypted = encryptedData.slice(28);

      const key = await this.generateKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );

      const decryptedBlob = new Blob([decrypted], { type: originalType });

      return {
        success: true,
        decryptedFile: decryptedBlob
      };
    } catch (error) {
      console.error('File decryption error:', error);
      return { success: false, error: 'Decryption failed.' };
    }
  },

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Hash password (for PIN verification)
   */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  },

  /**
   * Convert ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /**
   * Convert Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Verify if crypto API is available
   */
  isCryptoAvailable() {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined';
  }
};


export const secureStorage = {
  /**
   * Store encrypted data in localStorage
   */
  async setItem(key, value, password) {
    try {
      const encrypted = await encryptionService.encryptData(
        JSON.stringify(value),
        password
      );

      if (encrypted.success) {
        localStorage.setItem(key, encrypted.encrypted);
        return { success: true };
      }

      return { success: false, error: encrypted.error };
    } catch (error) {
      console.error('Secure storage set error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Retrieve and decrypt data from localStorage
   */
  async getItem(key, password) {
    try {
      const encrypted = localStorage.getItem(key);
      
      if (!encrypted) {
        return { success: false, error: 'Item not found' };
      }

      const decrypted = await encryptionService.decryptData(encrypted, password);

      if (decrypted.success) {
        return { success: true, value: JSON.parse(decrypted.decrypted) };
      }

      return { success: false, error: decrypted.error };
    } catch (error) {
      console.error('Secure storage get error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove item from secure storage
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Clear all secure storage
   */
  clear() {
    try {
      localStorage.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};


export const signatureService = {
  /**
   * Generate key pair for signing
   */
  async generateKeyPair() {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
      );

      return { success: true, keyPair };
    } catch (error) {
      console.error('Key generation error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign data (for evidence authentication)
   */
  async signData(data, privateKey) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));

      const signature = await crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        privateKey,
        dataBuffer
      );

      return {
        success: true,
        signature: encryptionService.arrayBufferToBase64(signature)
      };
    } catch (error) {
      console.error('Signing error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Verify signature
   */
  async verifySignature(data, signature, publicKey) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      const signatureBuffer = encryptionService.base64ToArrayBuffer(signature);

      const isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      );

      return { success: true, valid: isValid };
    } catch (error) {
      console.error('Verification error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create evidence package with digital signature
   */
  async createEvidencePackage(evidence, privateKey) {
    try {
      const metadata = {
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        evidence: evidence
      };

      const signature = await this.signData(metadata, privateKey);

      if (signature.success) {
        return {
          success: true,
          package: {
            ...metadata,
            digitalSignature: signature.signature,
            algorithm: 'ECDSA-P256-SHA256'
          }
        };
      }

      return { success: false, error: signature.error };
    } catch (error) {
      console.error('Evidence package error:', error);
      return { success: false, error: error.message };
    }
  }
};

export default {
  encryptionService,
  secureStorage,
  signatureService
};