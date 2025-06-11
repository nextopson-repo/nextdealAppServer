import * as tf from '@tensorflow/tfjs-node';
import { ModelLoader } from '@/ml-models/modelLoader';

interface RoomClassificationResult {
  label: string;
  confidence: string;
}

class ImageClassificationService {
  private readonly classNames = ['Bathroom', 'Bedroom', 'Dining', 'Kitchen', 'Livingroom'] as const;

  async predictRoom(imageBuffer: Buffer): Promise<RoomClassificationResult> {
    const modelLoader = ModelLoader.getInstance();
    const model = modelLoader.getRoomModel();
    
    if (!model) {
      throw new Error('Room model not loaded');
    }

    try {
      const tensor = tf.node.decodeImage(imageBuffer)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(tf.scalar(255.0))
        .expandDims();
      console.log('Input tensor shape for room:', tensor.shape);

      const prediction = model.predict(tensor) as tf.Tensor;
      const values = Array.from(prediction.dataSync());
      tensor.dispose();
      prediction.dispose();

      const maxIndex = values.indexOf(Math.max(...values));
      return {
        label: this.classNames[maxIndex],
        confidence: (values[maxIndex] * 100).toFixed(2) + '%',
      };
    } catch (error) {
      console.error('Prediction processing error:', error);
      throw error;
    }
  }
}

export default new ImageClassificationService();