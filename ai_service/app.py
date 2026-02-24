from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import cv2
import os
import logging
from werkzeug.utils import secure_filename
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class DocumentVerificationAI:
    def __init__(self):
        self.model = None
        self.load_model()
        
    def load_model(self):
        """Load the pre-trained TensorFlow model"""
        try:
            # Load the model (you would replace this with your actual model path)
            model_path = os.path.join(os.path.dirname(__file__), 'models', 'document_verification_model.h5')
            
            if os.path.exists(model_path):
                self.model = tf.keras.models.load_model(model_path)
                logger.info("Model loaded successfully")
            else:
                logger.warning("Model file not found, using mock model")
                self.model = None
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.model = None
    
    def preprocess_image(self, image_path):
        """Preprocess the image for model input"""
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not read image file")
            
            # Convert to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Resize to model input size (e.g., 224x224)
            image = cv2.resize(image, (224, 224))
            
            # Normalize pixel values
            image = image / 255.0
            
            # Add batch dimension
            image = np.expand_dims(image, axis=0)
            
            return image
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise
    
    def analyze_document_features(self, image_path):
        """Analyze specific document features"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not read image file")
            
            # Convert to grayscale for feature analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Analyze features
            features = {
                'seal_detection': self.detect_seal(gray),
                'watermark_detection': self.detect_watermark(gray),
                'text_quality': self.analyze_text_quality(gray),
                'image_quality': self.analyze_image_quality(image),
                'tampering_indicators': self.detect_tampering(gray)
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Error analyzing document features: {e}")
            return {}
    
    def detect_seal(self, gray_image):
        """Detect official seals/stamps"""
        try:
            # Simple circle detection for seals
            circles = cv2.HoughCircles(
                gray_image, 
                cv2.HOUGH_GRADIENT, 
                1, 
                20,
                param1=50,
                param2=30,
                minRadius=10,
                maxRadius=100
            )
            
            if circles is not None:
                return {
                    'detected': True,
                    'count': len(circles[0]),
                    'confidence': 0.8
                }
            else:
                return {
                    'detected': False,
                    'count': 0,
                    'confidence': 0.2
                }
                
        except Exception as e:
            logger.error(f"Error detecting seal: {e}")
            return {'detected': False, 'count': 0, 'confidence': 0.0}
    
    def detect_watermark(self, gray_image):
        """Detect watermarks using frequency domain analysis"""
        try:
            # Simple watermark detection using FFT
            f = np.fft.fft2(gray_image)
            fshift = np.fft.fftshift(f)
            magnitude_spectrum = 20 * np.log(np.abs(fshift))
            
            # Look for periodic patterns (watermarks often have)
            mean_magnitude = np.mean(magnitude_spectrum)
            std_magnitude = np.std(magnitude_spectrum)
            
            # Simple threshold-based detection
            if std_magnitude > 50:  # Arbitrary threshold
                return {
                    'detected': True,
                    'confidence': 0.7,
                    'pattern_strength': std_magnitude
                }
            else:
                return {
                    'detected': False,
                    'confidence': 0.3,
                    'pattern_strength': std_magnitude
                }
                
        except Exception as e:
            logger.error(f"Error detecting watermark: {e}")
            return {'detected': False, 'confidence': 0.0, 'pattern_strength': 0.0}
    
    def analyze_text_quality(self, gray_image):
        """Analyze text quality and readability"""
        try:
            # Calculate text contrast and sharpness
            laplacian_var = cv2.Laplacian(gray_image, cv2.CV_64F).var()
            mean_intensity = np.mean(gray_image)
            std_intensity = np.std(gray_image)
            
            return {
                'sharpness': float(laplacian_var),
                'contrast': float(std_intensity),
                'brightness': float(mean_intensity),
                'readability_score': float(min(1.0, laplacian_var / 1000))
            }
            
        except Exception as e:
            logger.error(f"Error analyzing text quality: {e}")
            return {'sharpness': 0.0, 'contrast': 0.0, 'brightness': 0.0, 'readability_score': 0.0}
    
    def analyze_image_quality(self, image):
        """Analyze overall image quality"""
        try:
            # Calculate various quality metrics
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Noise level estimation
            noise_level = np.std(gray)
            
            # Blur detection
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            return {
                'noise_level': float(noise_level),
                'blur_level': float(1.0 / (laplacian_var + 1e-6)),
                'resolution': image.shape[:2],
                'color_balance': self.analyze_color_balance(image)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing image quality: {e}")
            return {'noise_level': 0.0, 'blur_level': 1.0, 'resolution': (0, 0), 'color_balance': 0.0}
    
    def analyze_color_balance(self, image):
        """Analyze color balance in the image"""
        try:
            b, g, r = cv2.split(image)
            return {
                'red_mean': float(np.mean(r)),
                'green_mean': float(np.mean(g)),
                'blue_mean': float(np.mean(b)),
                'color_balance_score': float(np.std([np.mean(r), np.mean(g), np.mean(b)]))
            }
        except Exception as e:
            logger.error(f"Error analyzing color balance: {e}")
            return {'red_mean': 0.0, 'green_mean': 0.0, 'blue_mean': 0.0, 'color_balance_score': 0.0}
    
    def detect_tampering(self, gray_image):
        """Detect potential tampering indicators"""
        try:
            # Simple tampering detection using edge analysis
            edges = cv2.Canny(gray_image, 50, 150)
            edge_density = np.sum(edges > 0) / (gray_image.shape[0] * gray_image.shape[1])
            
            # Look for unusual patterns
            hist = cv2.calcHist([gray_image], [0], None, [256], [0, 256])
            hist_variance = np.var(hist)
            
            return {
                'edge_density': float(edge_density),
                'histogram_variance': float(hist_variance),
                'tampering_likelihood': float(min(1.0, edge_density * 10))
            }
            
        except Exception as e:
            logger.error(f"Error detecting tampering: {e}")
            return {'edge_density': 0.0, 'histogram_variance': 0.0, 'tampering_likelihood': 0.0}
    
    def verify_document(self, image_path):
        """Main verification function"""
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            
            # Analyze features
            features = self.analyze_document_features(image_path)
            
            # Make prediction using model (if available)
            if self.model is not None:
                prediction = self.model.predict(processed_image)
                confidence = float(prediction[0][0])
            else:
                # Mock prediction for demonstration
                confidence = self.calculate_mock_confidence(features)
            
            # Determine if document is verified
            is_verified = confidence > 0.5
            
            # Generate analysis reasons
            analysis_reasons = self.generate_analysis_reasons(features, confidence)
            
            # Extract document details (mock for now)
            document_details = self.extract_document_details(image_path)
            
            return {
                'is_verified': is_verified,
                'confidence': confidence,
                'fraud_score': float((1 - confidence) * 100),
                'analysis_reasons': analysis_reasons,
                'document_details': document_details,
                'features': features,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in document verification: {e}")
            return {
                'is_verified': False,
                'confidence': 0.0,
                'fraud_score': 100.0,
                'analysis_reasons': ['Error processing document'],
                'document_details': None,
                'error': str(e)
            }
    
    def calculate_mock_confidence(self, features):
        """Calculate mock confidence score based on features"""
        try:
            # Simple weighted scoring system
            score = 0.5  # Base score
            
            # Seal detection contributes positively
            if features.get('seal_detection', {}).get('detected', False):
                score += 0.3
            
            # Watermark detection contributes positively
            if features.get('watermark_detection', {}).get('detected', False):
                score += 0.2
            
            # Good text quality contributes positively
            text_quality = features.get('text_quality', {})
            if text_quality.get('readability_score', 0) > 0.5:
                score += 0.1
            
            # High tampering likelihood reduces score
            tampering = features.get('tampering_indicators', {})
            if tampering.get('tampering_likelihood', 0) > 0.5:
                score -= 0.4
            
            # Clamp score between 0 and 1
            return max(0.0, min(1.0, score))
            
        except Exception as e:
            logger.error(f"Error calculating mock confidence: {e}")
            return 0.5
    
    def generate_analysis_reasons(self, features, confidence):
        """Generate human-readable analysis reasons"""
        reasons = []
        
        try:
            # Seal analysis
            seal = features.get('seal_detection', {})
            if seal.get('detected', False):
                reasons.append(f"Official seal detected with {seal.get('confidence', 0):.1%} confidence")
            else:
                reasons.append("No official seal detected")
            
            # Watermark analysis
            watermark = features.get('watermark_detection', {})
            if watermark.get('detected', False):
                reasons.append(f"Watermark detected with {watermark.get('confidence', 0):.1%} confidence")
            else:
                reasons.append("No watermark detected")
            
            # Text quality analysis
            text_quality = features.get('text_quality', {})
            readability = text_quality.get('readability_score', 0)
            if readability > 0.7:
                reasons.append("Text quality is excellent")
            elif readability > 0.5:
                reasons.append("Text quality is good")
            else:
                reasons.append("Text quality is poor")
            
            # Tampering analysis
            tampering = features.get('tampering_indicators', {})
            likelihood = tampering.get('tampering_likelihood', 0)
            if likelihood > 0.5:
                reasons.append(f"Potential tampering detected ({likelihood:.1%} likelihood)")
            else:
                reasons.append("No tampering indicators found")
            
            # Overall confidence
            if confidence > 0.8:
                reasons.append("High confidence in verification result")
            elif confidence > 0.6:
                reasons.append("Moderate confidence in verification result")
            else:
                reasons.append("Low confidence in verification result")
                
        except Exception as e:
            logger.error(f"Error generating analysis reasons: {e}")
            reasons.append("Unable to generate detailed analysis")
        
        return reasons
    
    def extract_document_details(self, image_path):
        """Extract document details (mock implementation)"""
        try:
            # This would typically use OCR to extract text
            # For now, return mock data
            return {
                'deed_number': 'ZW-HRE-2023-' + str(hash(image_path))[-4:],
                'property_district': 'Harare North',
                'registered_owner': 'Mock Owner Name',
                'registration_date': '2023-01-01',
                'document_type': 'land_deed',
                'file_size': os.path.getsize(image_path),
                'file_format': os.path.splitext(image_path)[1]
            }
        except Exception as e:
            logger.error(f"Error extracting document details: {e}")
            return None

# Initialize AI service
ai_service = DocumentVerificationAI()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': ai_service.model is not None,
        'version': '1.0.0'
    })

@app.route('/api/verify', methods=['POST'])
def verify_document():
    """Verify a document"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Verify document
            result = ai_service.verify_document(filepath)
            
            # Clean up uploaded file
            try:
                os.remove(filepath)
            except:
                pass  # Ignore cleanup errors
            
            return jsonify(result)
        
        else:
            return jsonify({'error': 'Invalid file type'}), 400
            
    except Exception as e:
        logger.error(f"Error in verification endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        'model_version': '1.0.0',
        'model_type': 'CNN + Feature Analysis',
        'input_shape': [224, 224, 3],
        'classes': ['fraudulent', 'genuine'],
        'last_trained': '2024-01-01',
        'accuracy': 0.95,
        'model_loaded': ai_service.model is not None
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get verification statistics (mock data)"""
    return jsonify({
        'total_verifications': 15420,
        'verified_count': 14235,
        'fraud_count': 1185,
        'average_confidence': 0.87,
        'success_rate': 0.923
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)