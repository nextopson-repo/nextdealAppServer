import * as tf from '@tensorflow/tfjs-node';
import { fileURLToPath } from 'url';
import { join, dirname, resolve } from 'path';

class NsfwDetectionService {
  private model: tf.GraphModel | undefined;

  constructor() {
    this.loadModel().catch((error) => console.error('NSFW model loading failed on startup:', error));
  }

  private async loadModel() {
    try {
      // Resolve the directory dynamically using import.meta.url
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const modelPath = resolve(__dirname, '../../../src/ml-models/nsfw');
      console.log('Attempting to load NSFW model from:', modelPath);
      this.model = await tf.loadGraphModel(`file://${modelPath}/model.json`);
      console.log('NSFW model loaded successfully');
    } catch (error) {
      console.error('Error loading NSFW model:', error);
      throw error;
    }
  }

  async predict(imageBuffer: Buffer): Promise<any> {
    if (!this.model) {
      await this.loadModel();
      if (!this.model) throw new Error('NSFW model not loaded');
    }

    try {
      const tensor = tf.node.decodeImage(imageBuffer)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(tf.scalar(255.0))
        .expandDims();
      console.log('Input tensor shape for NSFW:', tensor.shape);

      const prediction = this.model.predict(tensor) as tf.Tensor;
      const values = Array.from(prediction.dataSync());
      tensor.dispose();
      prediction.dispose();

      const classLabels = { '0': 'drawings', '1': 'hentai', '2': 'neutral', '3': 'porn', '4': 'sexy' };
      const classIndex = values.indexOf(Math.max(...values));
      const predictedClass = classLabels[classIndex.toString()];
      const adultClasses = ['hentai', 'porn', 'sexy'];
      const confidence = (values[classIndex] * 100).toFixed(2) + '%';

      return {
        label: predictedClass,
        confidence,
        isAdult: adultClasses.includes(predictedClass),
      };
    } catch (error) {
      console.error('NSFW prediction error:', error);
      throw error;
    }
  }
}

export default new NsfwDetectionService();