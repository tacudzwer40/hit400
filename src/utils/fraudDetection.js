import * as tf from '@tensorflow/tfjs';

// Enhanced fraud detection model with training and pattern analysis
class FraudDetectionModel {
  constructor() {
    this.model = null;
    this.isTrained = false;
    this.trainingData = this.generateTrainingData();
  }

  // Generate synthetic training data for demonstration
  generateTrainingData() {
    const data = [];
    const labels = [];

    // Generate legitimate deed examples
    for (let i = 0; i < 500; i++) {
      const deed = {
        price: Math.random() * 500000 + 50000, // $50k - $550k
        area: Math.random() * 5000 + 500, // 500 - 5500 sqm
        locationRisk: Math.random() * 0.3, // Low risk areas
        ownerHistory: Math.floor(Math.random() * 3) + 1, // 1-3 owners
        verificationCount: Math.floor(Math.random() * 5) + 1, // 1-5 verifications
        registrationYear: Math.floor(Math.random() * 20) + 2000, // 2000-2020
        transactionFrequency: Math.random() * 0.2, // Low frequency
        pricePerSqm: 0, // Will be calculated
        isUrban: Math.random() > 0.7, // 30% urban
        ownerAge: Math.floor(Math.random() * 40) + 25, // 25-65 years
        hasLegalRepresentation: Math.random() > 0.2 // 80% have legal rep
      };

      deed.pricePerSqm = deed.price / deed.area;
      data.push(this.extractFeatures(deed));
      labels.push(0); // Legitimate
    }

    // Generate fraudulent deed examples
    for (let i = 0; i < 300; i++) {
      const deed = {
        price: Math.random() * 2000000 + 100000, // $100k - $2.1M (suspiciously high)
        area: Math.random() * 2000 + 100, // 100 - 2100 sqm (unusually small for high price)
        locationRisk: Math.random() * 0.7 + 0.3, // High risk areas
        ownerHistory: Math.floor(Math.random() * 8) + 3, // 3-10 owners (frequent transfers)
        verificationCount: Math.floor(Math.random() * 2), // 0-1 verifications
        registrationYear: Math.floor(Math.random() * 5) + 2020, // Very recent
        transactionFrequency: Math.random() * 0.8 + 0.2, // High frequency
        pricePerSqm: 0, // Will be calculated
        isUrban: Math.random() > 0.9, // 90% urban (suspicious concentration)
        ownerAge: Math.floor(Math.random() * 30) + 18, // 18-48 years (younger owners)
        hasLegalRepresentation: Math.random() > 0.7 // 30% have legal rep (suspicious)
      };

      deed.pricePerSqm = deed.price / deed.area;
      data.push(this.extractFeatures(deed));
      labels.push(1); // Fraudulent
    }

    return { features: data, labels };
  }

  async loadModel() {
    if (this.model) return this.model;

    // Create enhanced sequential model
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ inputShape: [12], units: 32, activation: 'relu' }));
    this.model.add(tf.layers.dropout({ rate: 0.2 }));
    this.model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    this.model.add(tf.layers.dropout({ rate: 0.1 }));
    this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    // Train the model if not already trained
    if (!this.isTrained) {
      await this.trainModel();
    }

    return this.model;
  }

  async trainModel() {
    const { features, labels } = this.trainingData;

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
          }
        }
      }
    });

    xs.dispose();
    ys.dispose();
    this.isTrained = true;
    console.log('Fraud detection model trained successfully');
  }

  // Enhanced feature extraction from deed data
  extractFeatures(deed) {
    const currentYear = new Date().getFullYear();
    const registrationYear = deed.registrationYear || (deed.timestamp ? new Date(deed.timestamp).getFullYear() : currentYear);
    const registrationAge = currentYear - registrationYear;

    // Estimate price based on available data (this would be extracted from OCR in real app)
    const price = deed.price || this.estimatePrice(deed);

    // Estimate area based on location patterns
    const area = deed.area || this.estimateArea(deed);

    // Calculate location risk based on location patterns
    const locationRisk = deed.locationRisk || this.calculateLocationRisk(deed.location || '');

    // Estimate owner history (number of previous transactions)
    const ownerHistory = deed.ownerHistory || Math.floor(Math.random() * 3) + 1;

    // Verification count based on available confidence scores
    const verificationCount = deed.verificationCount ||
      (deed.signatureConfidence > 0.7 ? 1 : 0) +
      (deed.watermarkConfidence > 0.7 ? 1 : 0);

    // Transaction frequency (estimated)
    const transactionFrequency = deed.transactionFrequency || Math.random() * 0.3;

    // Price per square meter
    const pricePerSqm = price / (area || 1);

    // Urban classification
    const isUrban = deed.isUrban !== undefined ? deed.isUrban :
      (deed.location || '').toLowerCase().includes('harare') ||
      (deed.location || '').toLowerCase().includes('bulawayo');

    // Owner age estimation
    const ownerAge = deed.ownerAge || (25 + Math.floor(Math.random() * 40));

    // Legal representation
    const hasLegalRepresentation = deed.hasLegalRepresentation !== undefined ?
      deed.hasLegalRepresentation : Math.random() > 0.3;

    return [
      price,
      area,
      locationRisk,
      ownerHistory,
      verificationCount,
      registrationAge,
      transactionFrequency,
      pricePerSqm,
      isUrban ? 1 : 0,
      ownerAge,
      hasLegalRepresentation ? 1 : 0,
      price * locationRisk || 0 // Risk-weighted price
    ];
  }

  // Helper methods for estimation
  estimatePrice(deed) {
    // Simple price estimation based on location and deed number patterns
    const location = (deed.location || '').toLowerCase();
    let basePrice = 50000; // Base price

    if (location.includes('harare')) basePrice *= 2;
    if (location.includes('bulawayo')) basePrice *= 1.5;
    if (location.includes('industrial')) basePrice *= 0.7;

    // Add some randomness
    return basePrice * (0.5 + Math.random());
  }

  estimateArea(deed) {
    // Estimate area based on location type
    const location = (deed.location || '').toLowerCase();
    let baseArea = 500; // Base area in sqm

    if (location.includes('industrial')) baseArea *= 2;
    if (location.includes('township')) baseArea *= 0.8;

    return baseArea * (0.5 + Math.random());
  }

  calculateLocationRisk(location) {
    // Calculate risk based on location patterns
    const loc = location.toLowerCase();
    let risk = 0.2; // Base risk

    // High-risk areas (more fraud reports)
    if (loc.includes('highfield') || loc.includes('glenview')) risk += 0.3;
    if (loc.includes('industrial') || loc.includes('estate')) risk += 0.2;
    if (loc.includes('township')) risk += 0.1;

    // Low-risk areas (more affluent, verified)
    if (loc.includes('borrowdale') || loc.includes('mount pleasant')) risk -= 0.1;
    if (loc.includes('avondale') || loc.includes('greystone')) risk -= 0.1;

    return Math.max(0, Math.min(1, risk));
  }

  // Predict fraud risk for a deed
  async predictFraudRisk(deed) {
    await this.loadModel();
    const features = this.extractFeatures(deed);
    const input = tf.tensor2d([features]);
    const prediction = this.model.predict(input);
    const riskScore = (await prediction.data())[0];
    input.dispose();
    prediction.dispose();
    return riskScore;
  }

  // Enhanced suspicious pattern detection
  detectSuspiciousPatterns(deeds) {
    const patterns = [];

    // Pattern 1: Multiple properties under same owner (bulk speculation)
    const ownerGroups = {};
    deeds.forEach(deed => {
      const owner = deed.owner || deed.ownerHash || 'unknown';
      if (!ownerGroups[owner]) ownerGroups[owner] = [];
      ownerGroups[owner].push(deed);
    });

    Object.keys(ownerGroups).forEach(owner => {
      const ownerDeeds = ownerGroups[owner];
      if (ownerDeeds.length > 5) {
        const totalValue = ownerDeeds.reduce((sum, d) => sum + (d.price || 0), 0);
        const avgPrice = totalValue / ownerDeeds.length;
        patterns.push({
          type: 'bulk_speculation',
          description: `Owner ${owner} has ${ownerDeeds.length} properties worth $${totalValue.toLocaleString()}`,
          risk: 0.7,
          affectedDeeds: ownerDeeds.map(d => d.id || d.deedNumber),
          severity: 'high'
        });
      }
    });

    // Pattern 2: Rapid registration sequence (potential automated fraud)
    const sortedDeeds = [...deeds].sort((a, b) => new Date(a.date || a.registrationDate) - new Date(b.date || b.registrationDate));
    for (let i = 1; i < sortedDeeds.length; i++) {
      const timeDiff = new Date(sortedDeeds[i].date || sortedDeeds[i].registrationDate) - new Date(sortedDeeds[i-1].date || sortedDeeds[i-1].registrationDate);
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 1) { // Less than 1 hour apart
        patterns.push({
          type: 'rapid_registration',
          description: `Deeds registered ${hoursDiff.toFixed(1)} hours apart - potential automated processing`,
          risk: 0.8,
          affectedDeeds: [sortedDeeds[i-1].id || sortedDeeds[i-1].deedNumber, sortedDeeds[i].id || sortedDeeds[i].deedNumber],
          severity: 'critical'
        });
      }
    }

    // Pattern 3: Unusual price fluctuations in same area
    const locationGroups = {};
    deeds.forEach(deed => {
      const location = deed.location || deed.locationHash || 'unknown';
      if (!locationGroups[location]) locationGroups[location] = [];
      locationGroups[location].push(deed);
    });

    Object.keys(locationGroups).forEach(location => {
      const locationDeeds = locationGroups[location];
      if (locationDeeds.length > 3) {
        const prices = locationDeeds.map(d => d.price || 0).sort((a, b) => a - b);
        const priceRange = prices[prices.length - 1] - prices[0];
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        if (priceRange / avgPrice > 2) { // More than 200% price variation
          patterns.push({
            type: 'price_anomaly',
            description: `Extreme price variation in ${location}: $${prices[0].toLocaleString()} - $${prices[prices.length - 1].toLocaleString()}`,
            risk: 0.6,
            affectedDeeds: locationDeeds.map(d => d.id || d.deedNumber),
            severity: 'medium'
          });
        }
      }
    });

    // Pattern 4: High-risk locations with frequent transactions
    const highRiskLocations = deeds.filter(d => (d.locationRisk || 0) > 0.7);
    if (highRiskLocations.length > 0) {
      const recentHighRisk = highRiskLocations.filter(d => {
        const deedDate = new Date(d.date || d.registrationDate);
        const daysSince = (new Date() - deedDate) / (1000 * 60 * 60 * 24);
        return daysSince < 30; // Last 30 days
      });

      if (recentHighRisk.length > 2) {
        patterns.push({
          type: 'high_risk_cluster',
          description: `${recentHighRisk.length} transactions in high-risk areas within last 30 days`,
          risk: 0.75,
          affectedDeeds: recentHighRisk.map(d => d.id || d.deedNumber),
          severity: 'high'
        });
      }
    }

    // Pattern 5: Young owners with high-value properties
    const youngHighValueOwners = deeds.filter(d =>
      (d.ownerAge || 30) < 25 &&
      (d.price || 0) > 500000 &&
      (d.verificationCount || 0) < 2
    );

    if (youngHighValueOwners.length > 0) {
      patterns.push({
        type: 'young_high_value',
        description: `${youngHighValueOwners.length} high-value properties owned by individuals under 25 with minimal verification`,
        risk: 0.65,
        affectedDeeds: youngHighValueOwners.map(d => d.id || d.deedNumber),
        severity: 'medium'
      });
    }

    return patterns;
  }

  // Get risk assessment summary
  async getRiskAssessment(deeds) {
    const assessments = [];

    for (const deed of deeds) {
      const riskScore = await this.predictFraudRisk(deed);
      const patterns = this.detectSuspiciousPatterns([deed]);

      let riskLevel = 'low';
      if (riskScore > 0.7) riskLevel = 'high';
      else if (riskScore > 0.4) riskLevel = 'medium';

      assessments.push({
        deedId: deed.id || deed.deedNumber,
        riskScore,
        riskLevel,
        patterns: patterns.length,
        factors: this.analyzeRiskFactors(deed, riskScore)
      });
    }

    return assessments;
  }

  // Analyze specific risk factors for a deed
  analyzeRiskFactors(deed, riskScore) {
    const factors = [];

    if ((deed.price || 0) > 1000000) {
      factors.push({ factor: 'High Property Value', impact: 'medium' });
    }

    if ((deed.locationRisk || 0) > 0.5) {
      factors.push({ factor: 'High-Risk Location', impact: 'high' });
    }

    if ((deed.ownerHistory || 0) > 5) {
      factors.push({ factor: 'Frequent Ownership Changes', impact: 'medium' });
    }

    if ((deed.verificationCount || 0) < 1) {
      factors.push({ factor: 'Low Verification Count', impact: 'high' });
    }

    const currentYear = new Date().getFullYear();
    const registrationAge = currentYear - (deed.registrationYear || currentYear);
    if (registrationAge < 1) {
      factors.push({ factor: 'Very Recent Registration', impact: 'medium' });
    }

    return factors;
  }
}

export default FraudDetectionModel;