import * as tf from '@tensorflow/tfjs-node';
import natural from 'natural';
import { loadTokenizer } from '@tensorflow-models/universal-sentence-encoder';
import { Property } from '@/api/entity/Property';

// NSFW words to filter out
const NSFW_WORDS = [
  'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'explicit',
  // Add more NSFW words as needed
];

export class PropertyTitleAndDescription {
  private static model: tf.LayersModel | null = null;
  private static tokenizer: any = null;
  private static readonly MAX_TITLE_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;
  private static readonly VOCAB_SIZE = 10000;
  private static readonly EMBEDDING_DIM = 256;

  private static async initializeModel() {
    if (!this.model) {
      // Load pre-trained model or create new one
      try {
        this.model = await tf.loadLayersModel('file://./models/property_generator/model.json');
      } catch {
        // Create new model if pre-trained model doesn't exist
        this.model = this.createModel();
      }

      // Initialize tokenizer
      this.tokenizer = await loadTokenizer();
    }
  }

  private static createModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.embedding({
      inputDim: this.VOCAB_SIZE,
      outputDim: this.EMBEDDING_DIM,
      inputLength: this.MAX_TITLE_LENGTH
    }));

    // LSTM layers for sequence processing
    model.add(tf.layers.lstm({
      units: 128,
      returnSequences: true
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: false
    }));

    // Dense layers for feature extraction
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));

    // Output layers for title and description
    model.add(tf.layers.dense({ units: this.VOCAB_SIZE, activation: 'softmax' }));

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private static async preprocessPropertyData(property: Property): Promise<tf.Tensor> {
    const features = [
      property.category,
      property.subCategory,
      property.propertyName,
      property.projectName,
      property.furnishing,
      property.address?.city,
      property.address?.state,
      property.address?.locality,
      property.amenities?.join(' '),
      property.constructionStatus,
      property.propertyFacing,
      property.ageOfTheProperty,
      property.bhks?.toString(),
      property.carpetArea?.toString(),
      property.buildupArea?.toString(),
      property.propertyPrice?.toString()
    ].filter(Boolean).join(' ');

    const tokens = await this.tokenizer.tokenize(features);
    const paddedSequence = this.padSequence(tokens, this.MAX_TITLE_LENGTH);
    return tf.tensor2d([paddedSequence]);
  }

  private static padSequence(sequence: number[], maxLength: number): number[] {
    if (sequence.length > maxLength) {
      return sequence.slice(0, maxLength);
    }
    return [...sequence, ...Array(maxLength - sequence.length).fill(0)];
  }

  private static isNSFW(text: string): boolean {
    const lowerText = text.toLowerCase();
    return NSFW_WORDS.some(word => lowerText.includes(word));
  }

  private static async generateTitle(property: Property): Promise<string> {
    await this.initializeModel();
    
    if (!property) return '';

    // Check for NSFW content
    if (property.propertyName && this.isNSFW(property.propertyName)) {
      throw new Error('NSFW content detected in property name');
    }

    const inputTensor = await this.preprocessPropertyData(property);
    const prediction = this.model!.predict(inputTensor) as tf.Tensor;
    const predictionArray = prediction.argMax(-1).arraySync() as number[][];
    const titleTokens = await this.tokenizer.detokenize(predictionArray[0]);
    
    // Clean and format the generated title
    const title = this.cleanGeneratedText(titleTokens);
    return title.length > this.MAX_TITLE_LENGTH ? 
      title.substring(0, this.MAX_TITLE_LENGTH) : title;
  }

  private static async generateDescription(property: Property): Promise<string> {
    await this.initializeModel();
    
    if (!property) return '';

    const inputTensor = await this.preprocessPropertyData(property);
    const prediction = this.model!.predict(inputTensor) as tf.Tensor;
    const predictionArray = prediction.argMax(-1).arraySync() as number[][];
    const descriptionTokens = await this.tokenizer.detokenize(predictionArray[0]);
    
    // Clean and format the generated description
    const description = this.cleanGeneratedText(descriptionTokens);
    return description.length > this.MAX_DESCRIPTION_LENGTH ? 
      description.substring(0, this.MAX_DESCRIPTION_LENGTH) : description;
  }

  private static cleanGeneratedText(text: string): string {
    // Remove special characters and extra spaces
    return text
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static async generate(property: Property): Promise<{ title: string; description: string }> {
    try {
      const title = await this.generateTitle(property);
      const description = await this.generateDescription(property);

      return {
        title,
        description
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('NSFW')) {
        throw new Error('NSFW content detected in property details');
      }
      throw error;
    }
  }

  // Method to train the model with new data
  public static async trainModel(trainingData: Array<{
    property: Property;
    title: string;
    description: string;
  }>): Promise<void> {
    await this.initializeModel();

    const X = await Promise.all(
      trainingData.map(data => this.preprocessPropertyData(data.property))
    );
    const X_tensor = tf.concat(X);

    const y_titles = await Promise.all(
      trainingData.map(data => this.tokenizer.tokenize(data.title))
    );
    const y_descriptions = await Promise.all(
      trainingData.map(data => this.tokenizer.tokenize(data.description))
    );

    const y_tensor = tf.concat([
      tf.tensor2d(y_titles),
      tf.tensor2d(y_descriptions)
    ]);

    await this.model!.fit(X_tensor, y_tensor, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });

    // Save the trained model
    await this.model!.save('file://./models/property_generator');
  }
}