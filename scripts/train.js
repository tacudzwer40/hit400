import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import FraudDetectionModel from '../src/utils/fraudDetection.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fileSystemWriter(dirPath) {
  return {
    save: async (modelArtifacts) => {
      const modelTopologyAndWeightManifest = {
        modelTopology: modelArtifacts.modelTopology,
        format: modelArtifacts.format,
        generatedBy: modelArtifacts.generatedBy,
        convertedBy: modelArtifacts.convertedBy,
        weightsManifest: [{
          paths: ['weights.bin'],
          weights: modelArtifacts.weightSpecs,
        }]
      };

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(
        join(dirPath, 'model.json'),
        JSON.stringify(modelTopologyAndWeightManifest)
      );

      if (modelArtifacts.weightData) {
        fs.writeFileSync(
          join(dirPath, 'weights.bin'),
          Buffer.from(modelArtifacts.weightData)
        );
      }

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON'
        }
      };
    }
  };
}

async function run() {
  console.log('Training Fraud Detection Model...');
  const fraudDetector = new FraudDetectionModel();
  
  // Create enhanced sequential model
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [12], units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  const { features, labels } = fraudDetector.trainingData;

  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels, [labels.length, 1]);

  await model.fit(xs, ys, {
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
  
  const saveDir = join(__dirname, '../public/models');
  if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
  }
  
  await model.save(fileSystemWriter(join(saveDir, 'fraud_model')));
  console.log('Fraud model saved to public/models/fraud_model');

  // Now the autoencoder from aiVerification.js
  console.log('Generating artificial deeds for anomaly autoencoder...');
  
  const deeds = Array.from({ length: 50 }, (_, i) => ({
    timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 365).toISOString(),
    deedNumber: `D-${Math.floor(Math.random()*10000)}`,
    owner: `Owner ${i}`,
    location: `Location ${i}`,
    hash: `abcdef${i}123`
  }));
  
  const buildFeatureVector = (deed) => {
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

  const data = deeds.map(buildFeatureVector);
  const tensor = tf.tensor2d(data);

  const inputDim = tensor.shape[1];
  const encoderDim = Math.max(2, Math.floor(inputDim / 2));

  const anomalyModel = tf.sequential();
  anomalyModel.add(tf.layers.dense({ inputShape: [inputDim], units: encoderDim, activation: 'relu' }));
  anomalyModel.add(tf.layers.dense({ units: inputDim, activation: 'sigmoid' }));

  anomalyModel.compile({ optimizer: tf.train.adam(0.01), loss: 'meanSquaredError' });

  await anomalyModel.fit(tensor, tensor, {
    epochs: 30,
    batchSize: Math.min(32, deeds.length),
    shuffle: true,
    verbose: 0
  });

  await anomalyModel.save(fileSystemWriter(join(saveDir, 'anomaly_model')));
  console.log('Anomaly model saved to public/models/anomaly_model');
}

run().catch(console.error);
