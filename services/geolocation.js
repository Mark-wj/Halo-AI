export const locationService = {
  /**
   * Get current user location with validation
   */
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp).toISOString(),
            quality: this.getLocationQuality(position.coords.accuracy)
          };
          
          // Validate coordinates
          if (this.isValidLocation(location)) {
            resolve(location);
          } else {
            reject(new Error('Invalid coordinates received'));
          }
        },
        (error) => {
          reject(this.handleLocationError(error));
        },
        defaultOptions
      );
    });
  },

  /**
   * Start watching user location (continuous tracking)
   */
  startWatching(callback, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000, 
      ...options
    };

    if (!navigator.geolocation) {
      callback(null, new Error('Geolocation is not supported'));
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp).toISOString(),
          quality: this.getLocationQuality(position.coords.accuracy)
        };
        
        if (this.isValidLocation(location)) {
          callback(location, null);
        } else {
          callback(null, new Error('Invalid location data'));
        }
      },
      (error) => {
        callback(null, this.handleLocationError(error));
      },
      defaultOptions
    );

    return watchId;
  },

  /**
   * Stop watching user location
   */
  stopWatching(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  /**
   * Get location quality assessment
   */
  getLocationQuality(accuracy) {
    if (accuracy < 10) return 'EXCELLENT';
    if (accuracy < 50) return 'GOOD';
    if (accuracy < 100) return 'FAIR';
    if (accuracy < 500) return 'POOR';
    return 'VERY_POOR';
  },

  /**
   * Validate location data
   */
  isValidLocation(location) {
    return (
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180 &&
      !isNaN(location.latitude) &&
      !isNaN(location.longitude)
    );
  },

  /**
   * Handle location errors
   */
  handleLocationError(error) {
    const errorMessages = {
      1: 'Location permission denied. Please enable location access in your browser settings.',
      2: 'Location information is unavailable. Please check your device settings.',
      3: 'Location request timed out. Please try again.',
    };
    
    return new Error(errorMessages[error.code] || 'An unknown error occurred while getting location.');
  },

  /**
   * Check if location services are available
   */
  isAvailable() {
    return 'geolocation' in navigator;
  },

  /**
   * Request location permission
   */
  async requestPermission() {
    try {
      const location = await this.getCurrentLocation();
      return { granted: true, location };
    } catch (error) {
      return { granted: false, error: error.message };
    }
  },

  /**
   * Get location with retry logic
   */
  async getCurrentLocationWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const location = await this.getCurrentLocation({
          timeout: 5000 * (i + 1), 
          maximumAge: i === 0 ? 0 : 10000 
        });
        return location;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
};


export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; 
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bearing (direction) from point A to point B
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  
  return (bearing * 180 / Math.PI + 360) % 360; 
}

/**
 * Get cardinal direction from bearing
 */
export function getCardinalDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

export const proximityService = {
  /**
   * Find nearest resources with intelligent scoring
   */
  findNearestResources(userLocation, resources, maxDistance = 50, limit = 10, userProfile = {}) {
    if (!userLocation || !resources || resources.length === 0) {
      return [];
    }

    // Calculate distance and smart score for each resource
    const resourcesWithDistance = resources
      .filter(resource => resource.latitude && resource.longitude)
      .map(resource => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          resource.latitude,
          resource.longitude
        );

        const bearing = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          resource.latitude,
          resource.longitude
        );

        // Calculate smart proximity score
        const smartScore = this.calculateSmartScore(distance, resource, userProfile);
        const priorityLevel = this.getPriorityLevel(distance, resource, userProfile);

        return {
          ...resource,
          distance,
          bearing,
          direction: getCardinalDirection(bearing),
          distanceText: this.formatDistance(distance),
          travelTime: this.estimateTravelTime(distance, 'walking'),
          drivingTime: this.estimateTravelTime(distance, 'driving'),
          emergencyTime: this.estimateTravelTime(distance, 'emergency'),
          smartScore,
          priorityLevel,
          matchReasons: this.getMatchReasons(resource, userProfile, distance)
        };
      });

    // Filter by max distance and sort by priority then smart score
    return resourcesWithDistance
      .filter(resource => resource.distance <= maxDistance)
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const priorityDiff = priorityOrder[b.priorityLevel] - priorityOrder[a.priorityLevel];
        
        if (priorityDiff !== 0) return priorityDiff;
        

        return b.smartScore - a.smartScore;
      })
      .slice(0, limit);
  },


  calculateSmartScore(distance, resource, userProfile = {}) {
    let score = 100;
    
   
    if (distance < 1) {
      score -= 0; 
    } else if (distance < 3) {
      score -= 5;
    } else if (distance < 5) {
      score -= 12;
    } else if (distance < 10) {
      score -= 22;
    } else if (distance < 25) {
      score -= 35;
    } else {
      score -= 45;
    }
    
    // 2. AVAILABILITY BONUS 
    if (resource.available_24_7) {
      score += 20;
    }
    
    // 3. RATING BONUS 
    if (resource.rating) {
      score += (resource.rating / 5) * 15;
    }
    
    // 4. CAPACITY BONUS (+10 points max)
    if (resource.capacity_score) {
      score += resource.capacity_score * 10;
    }
    
    // 5. RESPONSE TIME BONUS (+15 points max)
    if (resource.response_time) {
      if (resource.response_time < 0.5) score += 15; // < 30 min
      else if (resource.response_time < 1) score += 12; // < 1 hour
      else if (resource.response_time < 2) score += 8; // < 2 hours
      else if (resource.response_time < 6) score += 4; // < 6 hours
    }
    
    // 6. USER PROFILE MATCHING BONUSES
    
    // Immediate need bonus (+25 points)
    if (userProfile.needs_immediate && resource.available_24_7) {
      score += 25;
    }
    
    // Children bonus (+20 points)
    if (userProfile.has_children && resource.accepts_children) {
      score += 20;
    }
    
    // Risk level matching (+30 points max)
    if (userProfile.risk_level === 'CRITICAL') {
      if (resource.type === 'Police') score += 30;
      else if (resource.type === 'Shelter') score += 28;
      else if (resource.type === 'Medical') score += 25;
      else if (resource.type === 'Hotline') score += 20;
    } else if (userProfile.risk_level === 'HIGH') {
      if (resource.type === 'Shelter') score += 25;
      else if (resource.type === 'Legal') score += 20;
      else if (resource.type === 'Counseling') score += 18;
    }
    
    // Preferred county bonus (+15 points)
    if (userProfile.preferred_county && resource.county === userProfile.preferred_county) {
      score += 15;
    }
    
    // 7. SPECIALIZED SERVICES BONUS (+12 points)
    if (resource.specialized) {
      score += 12;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * Determine priority level for resource
   */
  getPriorityLevel(distance, resource, userProfile = {}) {
    // CRITICAL: Emergency services for users in immediate danger
    if (userProfile.risk_level === 'CRITICAL') {
      if ((resource.type === 'Police' || resource.type === 'Hotline') && distance < 50) {
        return 'CRITICAL';
      }
      if ((resource.type === 'Shelter' || resource.type === 'Medical') && distance < 15) {
        return 'CRITICAL';
      }
    }
    
    // HIGH: Urgent services nearby
    if (userProfile.needs_immediate && resource.available_24_7 && distance < 10) {
      return 'HIGH';
    }
    
    if (userProfile.risk_level === 'HIGH' && 
        (resource.type === 'Shelter' || resource.type === 'Police' || resource.type === 'Legal') &&
        distance < 20) {
      return 'HIGH';
    }
    
    // MEDIUM: Relevant services in reasonable distance
    if (distance < 30 && (resource.available_24_7 || resource.specialized)) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  },

  /**
   * Get match reasons for display
   */
  getMatchReasons(resource, userProfile, distance) {
    const reasons = [];
    
    if (distance < 2) reasons.push(`Very close - only ${this.formatDistance(distance)} away`);
    else if (distance < 5) reasons.push(`Nearby - ${this.formatDistance(distance)} away`);
    
    if (resource.available_24_7) reasons.push('Open 24/7 for immediate help');
    if (resource.accepts_children && userProfile.has_children) reasons.push('Child-friendly services');
    if (resource.rating >= 4.5) reasons.push(`Highly rated (${resource.rating}/5)`);
    if (resource.response_time < 1) reasons.push('Quick response time');
    if (resource.specialized) reasons.push('GBV specialized services');
    if (resource.county === userProfile.preferred_county) reasons.push(`Located in ${resource.county}`);
    
    return reasons;
  },

  /**
   * Find resources by type within radius with smart ranking
   */
  findResourcesByType(userLocation, resources, type, maxDistance = 50, userProfile = {}) {
    const allNearest = this.findNearestResources(userLocation, resources, maxDistance, 100, userProfile);
    return allNearest.filter(resource => resource.type === type);
  },

  /**
   * Get emergency resources (police, shelters, hospitals)
   */
  getEmergencyResources(userLocation, resources, userProfile = {}) {
    const emergencyTypes = ['Police', 'Shelter', 'Medical', 'Hotline'];
    const allNearest = this.findNearestResources(userLocation, resources, 100, 50, {
      ...userProfile,
      needs_immediate: true,
      risk_level: 'CRITICAL'
    });
    
    return allNearest.filter(resource => emergencyTypes.includes(resource.type));
  },

  /**
   * Format distance for display
   */
  formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  },

  /**
   * Estimate travel time with different modes
   */
  estimateTravelTime(distance, mode = 'walking') {
    const speeds = {
      walking: 5,    // km/h
      driving: 40,   // km/h (city traffic)
      emergency: 70  // km/h (emergency vehicle)
    };

    const speed = speeds[mode] || speeds.walking;
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);

    if (timeInMinutes < 1) {
      return '< 1 min';
    } else if (timeInMinutes < 60) {
      return `${timeInMinutes} min`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = timeInMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
  },

  /**
   * Group resources by proximity zones
   */
  groupByProximity(userLocation, resources, zones = [1, 5, 10, 25, 50], userProfile = {}) {
    const nearest = this.findNearestResources(userLocation, resources, Math.max(...zones), 1000, userProfile);
    
    return zones.reduce((acc, zone, index) => {
      const minDistance = index === 0 ? 0 : zones[index - 1];
      const maxDistance = zone;
      
      acc[`within_${zone}km`] = nearest.filter(
        r => r.distance > minDistance && r.distance <= maxDistance
      );
      
      return acc;
    }, {});
  }
};

export const mapService = {
  /**
   * Generate Google Maps URL for location
   */
  getGoogleMapsUrl(latitude, longitude, label = '') {
    return `https://www.google.com/maps?q=${latitude},${longitude}${label ? `+(${encodeURIComponent(label)})` : ''}`;
  },

  /**
   * Generate directions URL
   */
  getDirectionsUrl(fromLat, fromLon, toLat, toLon, mode = 'driving') {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}&travelmode=${mode}`;
  },

  /**
   * Generate Apple Maps URL (for iOS)
   */
  getAppleMapsUrl(latitude, longitude, label = '') {
    return `http://maps.apple.com/?q=${encodeURIComponent(label)}&ll=${latitude},${longitude}`;
  },

  /**
   * Generate platform-specific maps URL
   */
  getMapsUrl(latitude, longitude, label = '') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return isIOS 
      ? this.getAppleMapsUrl(latitude, longitude, label)
      : this.getGoogleMapsUrl(latitude, longitude, label);
  },

  /**
   * Generate shareable location URL
   */
  getShareableLocationUrl(latitude, longitude) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  },

  /**
   * Generate multi-destination route
   */
  getMultiDestinationUrl(waypoints) {
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const stops = waypoints.slice(1, -1);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}`;
    
    if (stops.length > 0) {
      const waypointsStr = stops.map(w => `${w.lat},${w.lon}`).join('|');
      url += `&waypoints=${waypointsStr}`;
    }
    
    return url;
  }
};


export const locationUtils = {
  /**
   * Format coordinates for display
   */
  formatCoordinates(latitude, longitude, precision = 6) {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    
    return {
      latitude: latitude.toFixed(precision),
      longitude: longitude.toFixed(precision),
      display: `${Math.abs(latitude).toFixed(precision)}°${latDir}, ${Math.abs(longitude).toFixed(precision)}°${lonDir}`
    };
  },

  /**
   * Validate coordinates
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  },

  /**
   * Get location accuracy description
   */
  getAccuracyDescription(accuracy) {
    if (accuracy < 10) return { level: 'Excellent', color: 'green', description: 'Very precise location' };
    if (accuracy < 50) return { level: 'Good', color: 'blue', description: 'Accurate location' };
    if (accuracy < 100) return { level: 'Fair', color: 'yellow', description: 'Acceptable accuracy' };
    if (accuracy < 500) return { level: 'Poor', color: 'orange', description: 'Low accuracy' };
    return { level: 'Very Poor', color: 'red', description: 'Very low accuracy' };
  },

  /**
   * Check if location is stale
   */
  isLocationStale(timestamp, maxAgeSeconds = 60) {
    const now = new Date().getTime();
    const locationTime = new Date(timestamp).getTime();
    const ageSeconds = (now - locationTime) / 1000;
    return ageSeconds > maxAgeSeconds;
  },

  /**
   * Get distance category
   */
  getDistanceCategory(distance) {
    if (distance < 1) return { category: 'Very Close', color: 'green' };
    if (distance < 5) return { category: 'Nearby', color: 'blue' };
    if (distance < 15) return { category: 'Moderate', color: 'yellow' };
    if (distance < 30) return { category: 'Far', color: 'orange' };
    return { category: 'Very Far', color: 'red' };
  },

  /**
   * Check if within service area (Kenya bounds)
   */
  isWithinKenya(latitude, longitude) {
    // Kenya approximate bounds
    const bounds = {
      north: 5.0,
      south: -4.7,
      east: 41.9,
      west: 33.9
    };
    
    return (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    );
  }
};

export default {
  locationService,
  proximityService,
  mapService,
  locationUtils,
  calculateDistance,
  calculateBearing,
  getCardinalDirection
};