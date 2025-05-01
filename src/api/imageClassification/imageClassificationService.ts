import * as tf from '@tensorflow/tfjs-node';
import { fileURLToPath } from 'url';
import { join, dirname, resolve } from 'path';

class ImageClassificationService {
  private roomModel: tf.LayersModel | undefined;

  constructor() {
    this.loadModel().catch((error) => console.error('Model loading failed on startup:', error));
  }

  private async loadModel() {
    try {
      // Resolve the directory dynamically using import.meta.url
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const modelPath = resolve(__dirname, '../../../src/ml-models/room-classifier/tfjs_model');
      console.log('Attempting to load room model from:', modelPath);
      this.roomModel = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      console.log('Room classification model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  async predictRoom(imageBuffer: Buffer): Promise<any> {
    if (!this.roomModel) {
      await this.loadModel();
      if (!this.roomModel) throw new Error('Room model not loaded');
    }

    try {
      const tensor = tf.node.decodeImage(imageBuffer)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(tf.scalar(255.0))
        .expandDims();
      console.log('Input tensor shape for room:', tensor.shape);

      const prediction = this.roomModel.predict(tensor) as tf.Tensor;
      const values = Array.from(prediction.dataSync());
      tensor.dispose();
      prediction.dispose();

      const classNames = ['Bathroom', 'Bedroom', 'Dining', 'Kitchen', 'Livingroom'];
      const maxIndex = values.indexOf(Math.max(...values));
      return {
        label: classNames[maxIndex],
        confidence: (values[maxIndex] * 100).toFixed(2) + '%',
      };
    } catch (error) {
      console.error('Prediction processing error:', error);
      throw error;
    }
  }
}

export default new ImageClassificationService();