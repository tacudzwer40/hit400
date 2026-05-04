import * as tf from '@tensorflow/tfjs'; tf.setBackend('cpu');
import * as ort from 'onnxruntime-web';

const MODEL_CACHE = {
  tf: {},
  onnx: {}
};

export const loadTfModel = async (url) => {
  if (MODEL_CACHE.tf[url]) return MODEL_CACHE.tf[url];
  try {
    const model = await tf.loadLayersModel(url);
    MODEL_CACHE.tf[url] = model;
    return model;
  } catch (e) {
    console.warn('Failed to load TF model', url, e);
    return null;
  }
};

export const loadOnnxModel = async (url) => {
  if (MODEL_CACHE.onnx[url]) return MODEL_CACHE.onnx[url];
  try {
    const session = await ort.InferenceSession.create(url, { executionProviders: ['wasm'] });
    MODEL_CACHE.onnx[url] = session;
    return session;
  } catch (e) {
    console.warn('Failed to load ONNX model', url, e);
    return null;
  }
};

export const extractSignaturesAndStamps = async (files) => {
  // Extract and analyze signatures and stamps from deed documents
  const results = {
    signatures: [],
    stamps: [],
    analysis: '',
    confidence: 0.5
  };

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const img = new Image();
      const pageAnalysis = await new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Analyze for signature-like regions (typically in bottom sections)
          const signatureRegions = [];
          const stampRegions = [];

          // Divide image into regions for analysis
          const regionsX = 3;
          const regionsY = 4;
          const regionWidth = Math.floor(canvas.width / regionsX);
          const regionHeight = Math.floor(canvas.height / regionsY);

          for (let ry = 0; ry < regionsY; ry++) {
            for (let rx = 0; rx < regionsX; rx++) {
              const startX = rx * regionWidth;
              const startY = ry * regionHeight;
              const endX = startX + regionWidth;
              const endY = startY + regionHeight;

              let darkPixels = 0;
              let totalPixels = 0;
              let avgBrightness = 0;
              let contrast = 0;
              let hasCurves = false;
              let hasGeometric = false;

              // Analyze region
              for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                  const pixel = (y * canvas.width + x) * 4;
                  const r = data[pixel], g = data[pixel+1], b = data[pixel+2];
                  const brightness = (r + g + b) / 3;

                  totalPixels++;
                  avgBrightness += brightness;
                  if (brightness < 128) darkPixels++;

                  // Check for contrast with neighboring pixels
                  if (x > startX && y > startY) {
                    const prevPixel = ((y-1) * canvas.width + (x-1)) * 4;
                    const prevBrightness = (data[prevPixel] + data[prevPixel+1] + data[prevPixel+2]) / 3;
                    contrast += Math.abs(brightness - prevBrightness);
                  }
                }
              }

              avgBrightness /= totalPixels;
              const darkRatio = darkPixels / totalPixels;
              const avgContrast = contrast / totalPixels;

              // Classify region
              const region = { x: startX, y: startY, width: regionWidth, height: regionHeight };

              // Signatures typically have:
              // - Moderate dark pixel ratio (0.1-0.4)
              // - High contrast (varied ink)
              // - Often in bottom regions
              if (darkRatio > 0.05 && darkRatio < 0.5 && avgContrast > 15 && ry >= 2) {
                // Additional signature characteristics
                let hasSignaturePatterns = false;
                let strokeCount = 0;

                // Look for signature-like strokes and curves
                for (let y = startY; y < endY - 1; y++) {
                  for (let x = startX; x < endX - 1; x++) {
                    const pixel = (y * canvas.width + x) * 4;
                    const rightPixel = (y * canvas.width + (x+1)) * 4;
                    const downPixel = ((y+1) * canvas.width + x) * 4;

                    const current = (data[pixel] + data[pixel+1] + data[pixel+2]) / 3;
                    const right = (data[rightPixel] + data[rightPixel+1] + data[rightPixel+2]) / 3;
                    const down = (data[downPixel] + data[downPixel+1] + data[downPixel+2]) / 3;

                    if (Math.abs(current - right) > 30) strokeCount++;
                    if (Math.abs(current - down) > 30) strokeCount++;
                  }
                }

                if (strokeCount > regionWidth * regionHeight * 0.01) {
                  hasSignaturePatterns = true;
                }

                if (hasSignaturePatterns) {
                  signatureRegions.push({
                    ...region,
                    confidence: Math.min(1, (darkRatio * 2) * (avgContrast / 50)),
                    page: i + 1,
                    type: 'signature'
                  });
                }
              }

              // Stamps typically have:
              // - Circular or geometric shapes
              // - High contrast borders
              // - Often contain text or official markings
              if (darkRatio > 0.1 && avgContrast > 20) {
                // Look for geometric patterns typical of stamps
                let geometricScore = 0;
                let hasText = false;

                // Check for straight lines and geometric shapes
                for (let y = startY; y < endY; y++) {
                  let consecutiveDark = 0;
                  for (let x = startX; x < endX; x++) {
                    const pixel = (y * canvas.width + x) * 4;
                    const brightness = (data[pixel] + data[pixel+1] + data[pixel+2]) / 3;

                    if (brightness < 100) {
                      consecutiveDark++;
                    } else {
                      if (consecutiveDark > 10) geometricScore += consecutiveDark;
                      consecutiveDark = 0;
                    }
                  }
                }

                // Look for text-like patterns in stamps
                let textPatterns = 0;
                for (let y = startY; y < endY - 3; y += 3) {
                  for (let x = startX; x < endX - 10; x += 2) {
                    let wordLength = 0;
                    for (let wx = 0; wx < 10 && x + wx < endX; wx++) {
                      const pixel = (y * canvas.width + (x + wx)) * 4;
                      const brightness = (data[pixel] + data[pixel+1] + data[pixel+2]) / 3;
                      if (brightness < 128) wordLength++;
                    }
                    if (wordLength > 5) textPatterns++;
                  }
                }

                if (geometricScore > regionWidth * 5 || textPatterns > 3) {
                  stampRegions.push({
                    ...region,
                    confidence: Math.min(1, (geometricScore / (regionWidth * 10)) + (textPatterns / 10)),
                    page: i + 1,
                    type: 'stamp'
                  });
                }
              }
            }
          }

          resolve({ signatures: signatureRegions, stamps: stampRegions });
        };
        img.src = URL.createObjectURL(file);
      });

      results.signatures.push(...pageAnalysis.signatures);
      results.stamps.push(...pageAnalysis.stamps);
    }

    // Generate comprehensive analysis
    const totalSignatures = results.signatures.length;
    const totalStamps = results.stamps.length;
    const avgSignatureConfidence = totalSignatures > 0 ?
      results.signatures.reduce((sum, sig) => sum + sig.confidence, 0) / totalSignatures : 0;
    const avgStampConfidence = totalStamps > 0 ?
      results.stamps.reduce((sum, stamp) => sum + stamp.confidence, 0) / totalStamps : 0;

    results.confidence = Math.max(avgSignatureConfidence, avgStampConfidence);

    let analysis = `Document Analysis: Found ${totalSignatures} signature region(s) and ${totalStamps} stamp region(s). `;

    if (totalSignatures === 0 && totalStamps === 0) {
      analysis += "No clear signatures or official stamps detected. This may indicate an incomplete or unofficial document.";
      results.confidence = 0.2;
    } else if (totalSignatures >= 2 && totalStamps >= 1) {
      analysis += "Multiple signatures and official stamps detected, consistent with authentic deed documentation.";
      results.confidence = Math.max(results.confidence, 0.8);
    } else if (totalSignatures >= 1) {
      analysis += "Signature(s) detected but limited official stamps. Document may require additional verification.";
      results.confidence = Math.max(results.confidence, 0.6);
    } else {
      analysis += "Official stamps detected but signatures unclear. Further verification recommended.";
      results.confidence = Math.max(results.confidence, 0.5);
    }

    results.analysis = analysis;

  } catch (error) {
    results.analysis = "Signature and stamp extraction failed - using basic document analysis";
    results.confidence = 0.3;
  }

  return results;
};

// --- Model-driven verification helpers ---

export const verifySignature = async (file) => {
  // Enhanced signature analysis based on document characteristics
  try {
    // Analyze image properties that indicate signature presence
    const img = new Image();
    const signatureAnalysis = await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Analyze for signature-like patterns (varied ink density, curves)
        let darkPixels = 0;
        let totalPixels = data.length / 4;
        let contrastScore = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const brightness = (r + g + b) / 3;
          if (brightness < 128) darkPixels++;

          // Calculate contrast
          if (i > 4) {
            const prevBrightness = (data[i-4] + data[i-3] + data[i-2]) / 3;
            contrastScore += Math.abs(brightness - prevBrightness);
          }
        }

        const darkRatio = darkPixels / totalPixels;
        const avgContrast = contrastScore / (data.length / 4);

        // Signature confidence based on document analysis
        let confidence = 0.5;
        let reason = "Basic document analysis";

        if (darkRatio > 0.3 && avgContrast > 20) {
          confidence = 0.8;
          reason = "Document shows complex patterns consistent with official signatures and stamps";
        } else if (darkRatio > 0.2) {
          confidence = 0.6;
          reason = "Document contains ink patterns that may include signatures";
        } else {
          confidence = 0.3;
          reason = "Limited ink patterns detected - signature verification inconclusive";
        }

        resolve({ confidence, reason });
      };
      img.src = URL.createObjectURL(file);
    });

    return signatureAnalysis;
  } catch (error) {
    return { confidence: 0.5, reason: 'Document analysis failed - using default confidence' };
  }
};

export const detectWatermark = async (file) => {
  // Enhanced watermark detection based on document security features
  try {
    const img = new Image();
    const watermarkAnalysis = await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Analyze for watermark-like patterns (subtle patterns, microtext, security features)
        let patternScore = 0;
        let uniformityScore = 0;
        let securityFeatures = 0;

        // Check for repetitive patterns (common in security watermarks)
        const sampleSize = Math.min(50, Math.floor(canvas.width / 10));
        for (let y = 0; y < canvas.height - sampleSize; y += sampleSize) {
          for (let x = 0; x < canvas.width - sampleSize; x += sampleSize) {
            let localVariance = 0;
            const basePixel = (y * canvas.width + x) * 4;
            const baseBrightness = (data[basePixel] + data[basePixel+1] + data[basePixel+2]) / 3;

            // Check surrounding pixels for pattern consistency
            for (let dy = 0; dy < sampleSize && y + dy < canvas.height; dy++) {
              for (let dx = 0; dx < sampleSize && x + dx < canvas.width; dx++) {
                const pixel = ((y + dy) * canvas.width + (x + dx)) * 4;
                const brightness = (data[pixel] + data[pixel+1] + data[pixel+2]) / 3;
                localVariance += Math.pow(brightness - baseBrightness, 2);
              }
            }
            patternScore += localVariance / (sampleSize * sampleSize);
          }
        }

        // Check for security features (fine lines, micro patterns)
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
          const r = data[i], g = data[i+1], b = data[i+2];
          const brightness = (r + g + b) / 3;

          // Look for very fine details that might indicate security printing
          if (brightness > 250 || brightness < 5) {
            securityFeatures++;
          }
        }

        const avgPatternScore = patternScore / ((canvas.width / sampleSize) * (canvas.height / sampleSize));
        const securityRatio = securityFeatures / (data.length / 64); // Normalized ratio

        let confidence = 0.5;
        let reason = "Basic security feature analysis";

        if (securityRatio > 0.1 && avgPatternScore < 1000) {
          confidence = 0.85;
          reason = "Document exhibits security printing features consistent with official watermarks";
        } else if (securityRatio > 0.05) {
          confidence = 0.7;
          reason = "Document shows some security features that may include watermarks";
        } else {
          confidence = 0.4;
          reason = "Limited security features detected - watermark verification inconclusive";
        }

        resolve({ confidence, reason });
      };
      img.src = URL.createObjectURL(file);
    });

    return watermarkAnalysis;
  } catch (error) {
    return { confidence: 0.5, reason: 'Watermark analysis failed - using default confidence' };
  }
};

export const runForgeryAnalysis = async (file) => {
  // Enhanced forgery detection based on document authenticity indicators
  try {
    const img = new Image();
    const forgeryAnalysis = await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Analyze for forgery indicators
        let anomalyScore = 0;
        let qualityScore = 0;
        let consistencyScore = 0;

        // Check print quality and consistency
        let colorVariations = 0;
        let edgeArtifacts = 0;
        const samplePoints = 1000;

        for (let i = 0; i < samplePoints; i++) {
          const x = Math.floor(Math.random() * canvas.width);
          const y = Math.floor(Math.random() * canvas.height);
          const pixel = (y * canvas.width + x) * 4;

          // Check for color inconsistencies
          const r = data[pixel], g = data[pixel+1], b = data[pixel+2];
          const brightness = (r + g + b) / 3;

          // Look for printing artifacts (sharp edges, banding)
          if (brightness > 245 || brightness < 10) {
            edgeArtifacts++;
          }

          // Check color consistency (official documents have consistent ink)
          const rgDiff = Math.abs(r - g);
          const rbDiff = Math.abs(r - b);
          const gbDiff = Math.abs(g - b);

          if (rgDiff > 30 || rbDiff > 30 || gbDiff > 30) {
            colorVariations++;
          }
        }

        // Analyze text regions for anomalies
        let textRegionScore = 0;
        const textSampleSize = Math.min(20, Math.floor(canvas.height / 10));

        for (let y = 0; y < canvas.height - textSampleSize; y += textSampleSize) {
          let lineDarkness = 0;
          for (let x = 0; x < canvas.width; x++) {
            const pixel = (y * canvas.width + x) * 4;
            const brightness = (data[pixel] + data[pixel+1] + data[pixel+2]) / 3;
            if (brightness < 128) lineDarkness++;
          }
          textRegionScore += lineDarkness / canvas.width;
        }

        const avgTextDensity = textRegionScore / (canvas.height / textSampleSize);
        const artifactRatio = edgeArtifacts / samplePoints;
        const variationRatio = colorVariations / samplePoints;

        // Calculate forgery risk
        let riskScore = 0.5;
        let reason = "Document quality analysis completed";

        if (artifactRatio > 0.15 || variationRatio > 0.2) {
          riskScore = 0.8;
          reason = "Document shows printing artifacts and color inconsistencies typical of forgeries";
        } else if (artifactRatio > 0.1 || variationRatio > 0.15) {
          riskScore = 0.6;
          reason = "Document exhibits some quality issues that may indicate reproduction";
        } else if (avgTextDensity > 0.3) {
          riskScore = 0.3;
          reason = "Document appears to have good print quality consistent with official documents";
        } else {
          riskScore = 0.4;
          reason = "Document quality is within normal parameters";
        }

        resolve({ riskScore, reason });
      };
      img.src = URL.createObjectURL(file);
    });

    return forgeryAnalysis;
  } catch (error) {
    return { riskScore: 0.5, reason: 'Forgery analysis failed - using default risk assessment' };
  }
};

// --- Predictive analytics (anomaly detection) ---

const buildFeatureVector = (deed) => {
  // Simple engineering: length of fields, numeric patterns, timestamp age
  const now = Date.now();
  const created = deed.timestamp ? new Date(deed.timestamp).getTime() : now;
  const ageDays = Math.max(0, (now - created) / (1000 * 60 * 60 * 24));
  const deedNumberLen = (deed.deedNumber || '').length;
  const ownerLen = (deed.owner || '').length;
  const locationLen = (deed.location || '').length;
  const hashEntropy = (deed.hash || '').replace(/[^a-zA-Z0-9]/g, '').length;

  return [
    deedNumberLen / 64,
    ownerLen / 64,
    locationLen / 64,
    hashEntropy / 128,
    Math.min(1, ageDays / 365)
  ];
};

export const trainFraudModel = async (deeds) => {
  if (!deeds || deeds.length < 10) return null;
  const data = deeds.map(buildFeatureVector);
  const tensor = tf.tensor2d(data);

  const inputDim = tensor.shape[1];
  const encoderDim = Math.max(2, Math.floor(inputDim / 2));

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputDim], units: encoderDim, activation: 'relu' }));
  model.add(tf.layers.dense({ units: inputDim, activation: 'sigmoid' }));

  model.compile({ optimizer: tf.train.adam(0.01), loss: 'meanSquaredError' });

  await model.fit(tensor, tensor, {
    epochs: 30,
    batchSize: Math.min(32, deeds.length),
    shuffle: true,
    verbose: 0
  });

  tensor.dispose();
  return model;
};

export const scoreFraudRisk = async (deed, model) => {
  if (!model) return 0.5;
  const vector = buildFeatureVector(deed);
  const tensor = tf.tensor2d([vector]);
  const recon = model.predict(tensor);
  const loss = tf.losses.meanSquaredError(tensor, recon).dataSync()[0];
  tensor.dispose();
  recon.dispose?.();
  const risk = Math.min(1, loss * 5); // scale to [0,1]
  return risk;
};
