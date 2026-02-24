const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const config = require('../config');

class VerificationService {
  constructor() {
    this.aiServiceUrl = config.aiService.endpoint;
    this.timeout = config.aiService.timeout;
    this.maxRetries = config.aiService.maxRetries;
  }

  /**
   * Verify a document using the AI service
   * @param {string} imagePath - Path to the processed image file
   * @returns {Promise<Object>} Verification result
   */
  async verifyDocument(imagePath) {
    try {
      logger.info(`Starting verification for image: ${imagePath}`);
      
      // Read the image file
      const imageBuffer = await fs.readFile(imagePath);
      
      // Prepare form data
      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', imageBuffer, {
        filename: path.basename(imagePath),
        contentType: 'image/jpeg'
      });

      // Make request to AI service
      const response = await this.makeAiRequest('/api/verify', {
        method: 'POST',
        data: form,
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const result = response.data;

      // Validate and format the response
      const formattedResult = this.formatAiResponse(result);

      logger.info(`Verification completed for ${imagePath}: ${formattedResult.isVerified ? 'VERIFIED' : 'FRAUD DETECTED'}`);
      
      return formattedResult;

    } catch (error) {
      logger.error('Error in document verification:', error);
      
      // Return fallback result for critical errors
      return {
        isVerified: false,
        confidence: 0,
        analysisReasons: ['System error: Unable to process document'],
        documentDetails: null,
        error: error.message
      };
    }
  }

  /**
   * Make a request to the AI service with retry logic
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response from AI service
   */
  async makeAiRequest(endpoint, options = {}) {
    const url = `${this.aiServiceUrl}${endpoint}`;
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`AI service request attempt ${attempt}/${this.maxRetries}: ${url}`);
        
        const response = await axios({
          url,
          timeout: this.timeout,
          ...options
        });

        return response;

      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          logger.error(`AI service request failed after ${this.maxRetries} attempts:`, error);
          throw new Error(`AI service unavailable: ${error.message}`);
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`AI service request failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Format and validate AI service response
   * @param {Object} aiResponse - Raw response from AI service
   * @returns {Object} Formatted verification result
   */
  formatAiResponse(aiResponse) {
    // Default values
    const result = {
      isVerified: false,
      confidence: 0,
      analysisReasons: [],
      documentDetails: null
    };

    try {
      // Extract verification result
      if (typeof aiResponse.is_verified === 'boolean') {
        result.isVerified = aiResponse.is_verified;
      }

      // Extract confidence score
      if (typeof aiResponse.confidence === 'number' && aiResponse.confidence >= 0 && aiResponse.confidence <= 1) {
        result.confidence = aiResponse.confidence;
      } else if (typeof aiResponse.fraud_score === 'number') {
        // Convert fraud score to confidence
        result.confidence = 1 - (aiResponse.fraud_score / 100);
      }

      // Extract analysis reasons
      if (Array.isArray(aiResponse.analysis_reasons)) {
        result.analysisReasons = aiResponse.analysis_reasons;
      } else if (typeof aiResponse.analysis_reasons === 'string') {
        result.analysisReasons = [aiResponse.analysis_reasons];
      }

      // Extract document details
      if (aiResponse.document_details) {
        result.documentDetails = {
          deedNumber: aiResponse.document_details.deed_number || null,
          propertyDistrict: aiResponse.document_details.property_district || null,
          registeredOwner: aiResponse.document_details.registered_owner || null,
          registrationDate: aiResponse.document_details.registration_date || null,
          documentType: aiResponse.document_details.document_type || 'land_deed'
        };
      }

      // Add default reasons if none provided
      if (result.analysisReasons.length === 0) {
        result.analysisReasons = result.isVerified 
          ? ['Document appears to be genuine based on available analysis']
          : ['Unable to verify document authenticity'];
      }

      return result;

    } catch (error) {
      logger.error('Error formatting AI response:', error);
      return result; // Return default values
    }
  }

  /**
   * Get verification statistics
   * @returns {Promise<Object>} Verification statistics
   */
  async getVerificationStats() {
    try {
      const response = await this.makeAiRequest('/api/stats', {
        method: 'GET'
      });

      return response.data || {};
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      return {
        totalVerifications: 0,
        verifiedCount: 0,
        fraudCount: 0,
        averageConfidence: 0
      };
    }
  }

  /**
   * Health check for AI service
   * @returns {Promise<boolean>} Service health status
   */
  async checkAiServiceHealth() {
    try {
      const response = await this.makeAiRequest('/health', {
        method: 'GET'
      });

      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      logger.warn('AI service health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get AI model information
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo() {
    try {
      const response = await this.makeAiRequest('/api/model/info', {
        method: 'GET'
      });

      return response.data || {};
    } catch (error) {
      logger.error('Error getting model info:', error);
      return {
        modelVersion: 'unknown',
        modelType: 'unknown',
        lastTrained: null,
        accuracy: 0
      };
    }
  }
}

module.exports = new VerificationService();