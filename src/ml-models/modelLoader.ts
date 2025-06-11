import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
import { fileURLToPath } from 'url';
import { pino } from 'pino';

const logger = pino({ name: 'model-loader' });

// Get the directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ModelLoader {
  private static instance: ModelLoader;
  private roomModel: tf.LayersModel | null = null;
  private nsfwModel: tf.LayersModel | null = null;

  private constructor() {}

  public static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  public async loadModels(): Promise<void> {
    try {
      await this.loadRoomModel();
      try {
        await this.loadNSFWModel();
      } catch (nsfwError) {
        logger.warn('NSFW model not available, continuing without it:', nsfwError);
        this.nsfwModel = null;
      }
    } catch (error) {
      logger.error('Error loading models:', error);
      throw error;
    }
  }

  private async loadRoomModel(): Promise<void> {
    try {
      const modelPath = path.join(__dirname, 'room-classifier/tfjs_model/model.json');
      logger.info('Loading room model from:', modelPath);
      this.roomModel = await tf.loadLayersModel(`file://${modelPath}`);
      logger.info('Room model loaded successfully');
    } catch (error) {
      logger.error('Failed to load room model:', error);
      throw error;
    }
  }

  private async loadNSFWModel(): Promise<void> {
    try {
      const modelPath = path.join(__dirname, 'nsfw/model.json');
      logger.info('Loading NSFW model from:', modelPath);
      this.nsfwModel = await tf.loadLayersModel(`file://${modelPath}`);
      logger.info('NSFW model loaded successfully');
    } catch (error) {
      logger.error('Failed to load NSFW model:', error);
      throw error;
    }
  }

  public getRoomModel(): tf.LayersModel | null {
    return this.roomModel;
  }

  public getNSFWModel(): tf.LayersModel | null {
    return this.nsfwModel;
  }
} 