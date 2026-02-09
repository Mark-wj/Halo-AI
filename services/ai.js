/**
 * AI-Powered Matching and Triage Service
 * Includes risk assessment scoring, resource matching, and report triage
 */

import { calculateDistance } from './geolocation';


export const riskScoringService = {
  /**
   * Calculate risk score from assessment answers
   * Based on WHO, Johns Hopkins, and ODARA validated instruments
   */
  calculateRiskScore(answers) {
    let score = 0;
    const factors = [];

    // Question weights based on predictive power for femicide
    const weights = {
      strangulation: 5,          
      deathThreats: 4,
      weaponAccess: 4,
      childrenHarmed: 5,
      controlJealousy: 3,
      recentSeparation: 3,
      escalatingViolence: 4,
      substanceAbuse: 2,
      fearLevel: 3,
      noSafePlace: 3
    };

    // Strangulation (highest risk factor)
    if (answers.strangulation === 'yes') {
      score += weights.strangulation;
      factors.push('Partner has attempted strangulation');
    }

    // Death threats
    if (answers.deathThreats === 'yes') {
      score += weights.deathThreats;
      factors.push('Partner has threatened to kill you');
    }

    // Weapon access
    if (answers.weaponAccess === 'yes') {
      score += weights.weaponAccess;
      factors.push('Partner has access to weapons');
    }

    // Children harmed
    if (answers.childrenHarmed === 'yes') {
      score += weights.childrenHarmed;
      factors.push('Children have been harmed or threatened');
    }

    // Control and jealousy
    if (answers.controlJealousy === 'severe') {
      score += weights.controlJealousy;
      factors.push('Extreme control and jealousy behaviors');
    } else if (answers.controlJealousy === 'moderate') {
      score += Math.floor(weights.controlJealousy / 2);
    }

    // Recent separation
    if (answers.recentSeparation === 'yes') {
      score += weights.recentSeparation;
      factors.push('Recent separation or leaving attempt');
    }

    // Escalating violence
    if (answers.escalatingViolence === 'yes') {
      score += weights.escalatingViolence;
      factors.push('Violence is increasing in frequency or severity');
    }

    // Substance abuse
    if (answers.substanceAbuse === 'yes') {
      score += weights.substanceAbuse;
      factors.push('Partner abuses drugs or alcohol');
    }

    // Fear level
    if (answers.fearLevel === 'very_afraid') {
      score += weights.fearLevel;
      factors.push('You are very afraid of your partner');
    } else if (answers.fearLevel === 'somewhat_afraid') {
      score += Math.floor(weights.fearLevel / 2);
    }

    // Safe place availability
    if (answers.safePlace === 'no') {
      score += weights.noSafePlace;
      factors.push('No safe place to go');
    }

    return {
      score,
      riskLevel: this.getRiskLevel(score),
      factors,
      maxScore: Object.values(weights).reduce((a, b) => a + b, 0)
    };
  },

  /**
   * Get risk level category
   */
  getRiskLevel(score) {
    if (score >= 15) return 'CRITICAL';
    if (score >= 10) return 'HIGH';
    if (score >= 5) return 'MEDIUM';
    return 'LOW';
  },

  /**
   * Get risk level details
   */
  getRiskLevelDetails(riskLevel) {
    const details = {
      CRITICAL: {
        color: 'red',
        label: 'Critical Danger',
        description: 'You are in immediate, life-threatening danger. Your situation shows multiple high-risk factors for fatal violence.',
        urgency: 'IMMEDIATE',
        recommendations: [
          'Consider activating Emergency SOS now',
          'Contact emergency shelter immediately',
          'Do NOT return home if unsafe',
          'Call police if in immediate danger (999)',
          'Tell someone you trust about your situation'
        ]
      },
      HIGH: {
        color: 'orange',
        label: 'High Risk',
        description: 'Your situation shows serious risk factors. The violence may escalate to life-threatening levels.',
        urgency: 'URGENT',
        recommendations: [
          'Create a detailed safety plan',
          'Contact a shelter to discuss options',
          'Consider a protection order',
          'Keep Emergency SOS ready',
          'Document all incidents for evidence'
        ]
      },
      MEDIUM: {
        color: 'yellow',
        label: 'Medium Risk',
        description: 'You are experiencing concerning patterns of abuse that could escalate.',
        urgency: 'IMPORTANT',
        recommendations: [
          'Speak with a counselor or advocate',
          'Learn about legal options',
          'Create a safety plan',
          'Connect with support services',
          'Keep documenting incidents'
        ]
      },
      LOW: {
        color: 'green',
        label: 'Lower Risk',
        description: 'While any abuse is unacceptable, your current situation shows fewer immediate risk factors.',
        urgency: 'IMPORTANT',
        recommendations: [
          'Stay informed about warning signs',
          'Build a support network',
          'Know your resources',
          'Continue monitoring the situation',
          'Seek counseling if needed'
        ]
      }
    };

    return details[riskLevel] || details.LOW;
  }
};


export const resourceMatchingService = {
  /**
   * Match resources to user needs using AI-like scoring
   */
  matchResources(userProfile, resources) {
    const scored = resources.map(resource => {
      let matchScore = 0;
      const matchReasons = [];

      // Risk level matching
      if (userProfile.riskLevel === 'CRITICAL') {
        if (resource.type === 'Shelter' && resource.emergencyCapacity) {
          matchScore += 50;
          matchReasons.push('Emergency shelter capacity available');
        }
        if (resource.type === 'Police') {
          matchScore += 40;
          matchReasons.push('Police protection available');
        }
      } else if (userProfile.riskLevel === 'HIGH') {
        if (resource.type === 'Shelter' || resource.type === 'Legal') {
          matchScore += 30;
          matchReasons.push('Protection and legal support');
        }
      }

      // Distance scoring 
      if (resource.distance) {
        if (resource.distance < 2) {
          matchScore += 30;
          matchReasons.push('Very close to your location');
        } else if (resource.distance < 5) {
          matchScore += 20;
          matchReasons.push('Nearby location');
        } else if (resource.distance < 10) {
          matchScore += 10;
        }
      }

      // Children consideration
      if (userProfile.hasChildren && resource.acceptsChildren) {
        matchScore += 25;
        matchReasons.push('Child-friendly services');
      }

      // 24/7 availability
      if (userProfile.needsImmediate && resource.available24_7) {
        matchScore += 20;
        matchReasons.push('Available 24/7');
      }

      // Currently open
      if (this.isCurrentlyOpen(resource)) {
        matchScore += 15;
        matchReasons.push('Currently open');
      }

      // Specialization match
      if (userProfile.needs && resource.specializations) {
        const matches = userProfile.needs.filter(need => 
          resource.specializations.includes(need)
        );
        matchScore += matches.length * 10;
        if (matches.length > 0) {
          matchReasons.push(`Specializes in ${matches.join(', ')}`);
        }
      }

      // Language match
      if (userProfile.language && resource.languages) {
        if (resource.languages.includes(userProfile.language)) {
          matchScore += 15;
          matchReasons.push(`${userProfile.language} language support`);
        }
      }

      // Capacity/availability
      if (resource.currentCapacity && resource.maxCapacity) {
        const availability = (resource.maxCapacity - resource.currentCapacity) / resource.maxCapacity;
        if (availability > 0.5) {
          matchScore += 10;
          matchReasons.push('Good availability');
        }
      }

      return {
        ...resource,
        matchScore,
        matchReasons,
        matchPercentage: Math.min(100, Math.round(matchScore))
      };
    });

    // Sort by match score
    return scored.sort((a, b) => b.matchScore - a.matchScore);
  },

  /**
   * Check if resource is currently open
   */
  isCurrentlyOpen(resource) {
    if (resource.available24_7) return true;
    if (!resource.operatingHours) return true; 

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const todayHours = resource.operatingHours[currentDay];
    if (!todayHours) return false;

    const [open, close] = todayHours.split('-').map(t => {
      const [hours, minutes] = t.trim().split(':');
      return parseInt(hours) * 100 + parseInt(minutes || 0);
    });

    return currentTime >= open && currentTime <= close;
  },

  /**
   * Get recommended resources based on risk assessment
   */
  getRecommendedResources(riskLevel, userLocation, allResources) {
    const recommendations = {
      CRITICAL: ['Shelter', 'Police', 'Medical'],
      HIGH: ['Shelter', 'Legal', 'Counseling', 'Police'],
      MEDIUM: ['Counseling', 'Legal', 'Support Groups'],
      LOW: ['Counseling', 'Legal', 'Support Groups']
    };

    const priorityTypes = recommendations[riskLevel] || recommendations.LOW;
    
    // Filter and score resources
    const filtered = allResources.filter(r => priorityTypes.includes(r.type));
    
    // Calculate distances
    const withDistance = filtered.map(resource => ({
      ...resource,
      distance: userLocation ? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        resource.latitude,
        resource.longitude
      ) : null
    }));

    // Match resources
    return this.matchResources(
      { riskLevel, location: userLocation },
      withDistance
    );
  }
};



export const reportTriageService = {
  /**
   * Analyze report and assign urgency score
   */
  analyzeReport(report) {
    let urgencyScore = 0;
    const urgencyFactors = [];
    const keywords = {
      critical: ['gun', 'knife', 'weapon', 'kill', 'murder', 'strangle', 'death', 'shoot'],
      high: ['hurt', 'beat', 'hit', 'blood', 'injured', 'broken', 'hospital', 'threatened'],
      medium: ['afraid', 'scared', 'yelling', 'screaming', 'fighting', 'arguing'],
      children: ['child', 'children', 'kids', 'baby', 'toddler'],
      frequency: ['every day', 'every night', 'constantly', 'always', 'repeatedly']
    };

    const text = (report.description || '').toLowerCase();

    // Critical keywords (+5)
    keywords.critical.forEach(word => {
      if (text.includes(word)) {
        urgencyScore += 5;
        urgencyFactors.push(`Mentions ${word}`);
      }
    });

    // High urgency keywords (+3)
    keywords.high.forEach(word => {
      if (text.includes(word)) {
        urgencyScore += 3;
        urgencyFactors.push(`Physical violence indicators`);
      }
    });

    // Medium urgency keywords (+2)
    keywords.medium.forEach(word => {
      if (text.includes(word)) {
        urgencyScore += 2;
      }
    });

    // Children present (+5)
    keywords.children.forEach(word => {
      if (text.includes(word)) {
        urgencyScore += 5;
        urgencyFactors.push('Children involved');
      }
    });

    // Frequency indicators (+3)
    keywords.frequency.forEach(word => {
      if (text.includes(word)) {
        urgencyScore += 3;
        urgencyFactors.push('Ongoing pattern');
      }
    });

    // Timing urgency
    if (report.timing === 'now') {
      urgencyScore += 10;
      urgencyFactors.push('Happening right now');
    } else if (report.timing === 'today') {
      urgencyScore += 5;
      urgencyFactors.push('Recent incident');
    }

    // Quick-select tags
    if (report.tags) {
      if (report.tags.includes('weapons')) {
        urgencyScore += 5;
        urgencyFactors.push('Weapons involved');
      }
      if (report.tags.includes('children')) {
        urgencyScore += 5;
        urgencyFactors.push('Children at risk');
      }
      if (report.tags.includes('physical')) {
        urgencyScore += 4;
        urgencyFactors.push('Physical violence');
      }
    }

    // Police already involved (lower urgency slightly)
    if (report.policeInvolved) {
      urgencyScore -= 2;
    }

    // Cap score at 10
    urgencyScore = Math.min(10, Math.max(0, urgencyScore));

    return {
      urgencyScore,
      urgencyLevel: this.getUrgencyLevel(urgencyScore),
      factors: [...new Set(urgencyFactors)], // Remove duplicates
      recommendedAction: this.getRecommendedAction(urgencyScore),
      responseTime: this.getResponseTime(urgencyScore)
    };
  },

  /**
   * Get urgency level from score
   */
  getUrgencyLevel(score) {
    if (score >= 9) return 'CRITICAL';
    if (score >= 6) return 'HIGH';
    if (score >= 3) return 'MEDIUM';
    return 'LOW';
  },

  /**
   * Get recommended action based on urgency
   */
  getRecommendedAction(score) {
    if (score >= 9) {
      return {
        primary: 'Immediate police alert',
        secondary: 'Emergency shelter notification',
        tertiary: 'Crisis NGO dispatch'
      };
    } else if (score >= 6) {
      return {
        primary: 'NGO notification within 1 hour',
        secondary: 'Community health worker visit within 24 hours',
        tertiary: 'Police awareness alert'
      };
    } else if (score >= 3) {
      return {
        primary: 'Discreet NGO outreach within 24-48 hours',
        secondary: 'Resources shared with reporter',
        tertiary: 'Pattern monitoring'
      };
    } else {
      return {
        primary: 'Information gathering',
        secondary: 'Community awareness',
        tertiary: 'Resource distribution'
      };
    }
  },

  /**
   * Get expected response time
   */
  getResponseTime(score) {
    if (score >= 9) return 'Immediate (within minutes)';
    if (score >= 6) return 'Within 1 hour';
    if (score >= 3) return 'Within 24-48 hours';
    return 'Within 1 week';
  },

  /**
   * Detect pattern of repeat reports
   */
  detectPatterns(reports) {
    const patterns = {
      sameLocation: [],
      samePerpetrator: [],
      escalating: []
    };

    // Group by location
    const byLocation = {};
    reports.forEach(report => {
      const key = `${report.location?.latitude},${report.location?.longitude}`;
      if (!byLocation[key]) byLocation[key] = [];
      byLocation[key].push(report);
    });

    // Find locations with multiple reports
    Object.entries(byLocation).forEach(([location, locationReports]) => {
      if (locationReports.length >= 2) {
        patterns.sameLocation.push({
          location,
          count: locationReports.length,
          reports: locationReports,
          recommendation: 'Increase patrol frequency'
        });
      }
    });

    return patterns;
  }
};

export default {
  riskScoringService,
  resourceMatchingService,
  reportTriageService
};