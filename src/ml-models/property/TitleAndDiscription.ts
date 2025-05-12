import * as tf from '@tensorflow/tfjs-node';
import natural from 'natural';
import { Property } from '@/api/entity/Property';

// NSFW words to filter out
const NSFW_WORDS = [
  'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'explicit',
  // Add more NSFW words as needed
];

export class PropertyTitleAndDescription {
  private static model: tf.LayersModel | null = null;
  private static tokenizer: natural.WordTokenizer;
  private static tokenToIndex: Map<string, number> = new Map();
  private static readonly MAX_TITLE_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 10000;
  private static readonly VOCAB_SIZE = 10000;
  private static readonly EMBEDDING_DIM = 256;

  private static async initializeModel() {
    if (!this.model) {
      try {
        // Try to load pre-trained model
        this.model = await tf.loadLayersModel('file://./models/property_generator/model.json');
      } catch {
        // Create new model if pre-trained model doesn't exist
        this.model = this.createModel();
      }
    }

    // Initialize tokenizer if not already initialized
    if (!this.tokenizer) {
      this.tokenizer = new natural.WordTokenizer();
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

    const tokens = this.tokenizer.tokenize(features);
    const paddedSequence = this.padSequence(tokens, this.MAX_TITLE_LENGTH);
    return tf.tensor2d([paddedSequence]);
  }

  private static padSequence(sequence: string[], maxLength: number): number[] {
    let currentIndex = 1; // Start from 1 to reserve 0 for padding

    // Convert tokens to indices
    const indices = sequence.map(token => {
      if (!this.tokenToIndex.has(token)) {
        this.tokenToIndex.set(token, currentIndex++);
      }
      return this.tokenToIndex.get(token)!;
    });

    // Pad or truncate sequence
    if (indices.length > maxLength) {
      return indices.slice(0, maxLength);
    }
    return [...indices, ...Array(maxLength - indices.length).fill(0)];
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
    
    // Convert prediction indices back to tokens
    const titleTokens = predictionArray[0].map(index => {
      // Find the token that corresponds to this index
      for (const [token, idx] of this.tokenToIndex.entries()) {
        if (idx === index) return token;
      }
      return '';
    }).filter(Boolean);

    // Clean and format the generated title
    const title = this.cleanGeneratedText(titleTokens.join(' '));
    return title.length > this.MAX_TITLE_LENGTH ? 
      title.substring(0, this.MAX_TITLE_LENGTH) : title;
  }

  private static async generateDescription(property: Property): Promise<string> {
    await this.initializeModel();
    
    if (!property) return '';

    const inputTensor = await this.preprocessPropertyData(property);
    const prediction = this.model!.predict(inputTensor) as tf.Tensor;
    const predictionArray = prediction.argMax(-1).arraySync() as number[][];
    
    // Convert prediction indices back to tokens
    const descriptionTokens = predictionArray[0].map(index => {
      // Find the token that corresponds to this index
      for (const [token, idx] of this.tokenToIndex.entries()) {
        if (idx === index) return token;
      }
      return '';
    }).filter(Boolean);

    // Clean and format the generated description
    const description = this.cleanGeneratedText(descriptionTokens.join(' '));
    return this.ensureMinimumWords(description, property).substring(0, this.MAX_DESCRIPTION_LENGTH);
  }

  private static cleanGeneratedText(text: string): string {
    // Remove special characters and extra spaces
    return text
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static ensureMinimumWords(text: string, property: Property, minWords = 30): string {
    let wordCount = text.split(/\s+/).length;
    let extraDetails = [
      property.amenities && property.amenities.length ? 'Amenities include: ' + property.amenities.join(', ') + '.' : '',
      property.addFurnishing && property.addFurnishing.length ? 'Additional furnishing: ' + property.addFurnishing.join(', ') + '.' : '',
      property.constructionStatus ? 'Construction status: ' + property.constructionStatus + '.' : '',
      property.propertyFacing ? 'Facing: ' + property.propertyFacing + '.' : '',
      property.ageOfTheProperty ? 'Property age: ' + property.ageOfTheProperty + '.' : '',
      property.reraApproved ? 'RERA approved.' : '',
      property.viewFromProperty && property.viewFromProperty.length ? 'Views: ' + property.viewFromProperty.join(', ') + '.' : '',
      property.parking ? 'Parking: ' + property.parking + '.' : '',
      property.availablefor ? 'Available for: ' + property.availablefor + '.' : '',
      property.unit ? 'Unit: ' + property.unit + '.' : '',
      property.soilType ? 'Soil type: ' + property.soilType + '.' : '',
      property.approachRoad ? 'Approach road: ' + property.approachRoad + '.' : '',
      property.totalfloors ? 'Total floors: ' + property.totalfloors + '.' : '',
      property.officefloor ? 'Office floor: ' + property.officefloor + '.' : '',
      property.yourfloor ? 'Your floor: ' + property.yourfloor + '.' : '',
      property.cabins ? 'Cabins: ' + property.cabins + '.' : '',
      property.washroom ? 'Washroom: ' + property.washroom + '.' : ''
    ].filter(Boolean);

    let i = 0;
    while (wordCount < minWords && i < extraDetails.length) {
      text += ' ' + extraDetails[i];
      wordCount = text.split(/\s+/).length;
      i++;
    }
    return text;
  }

  private static ruleBasedTitle(property: Property): string {
    return `${property.bhks || ''} BHK ${property.furnishing || ''} ${property.subCategory || ''} in ${property.projectName || property.propertyName || ''}, ${property.address?.locality || ''}, ${property.address?.city || ''}`.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
  }

  private static ruleBasedDescription(property: Property): string {
    return `Discover this spacious ${property.bhks || ''} BHK ${property.furnishing || ''} ${property.subCategory?.toLowerCase() || ''} located in ${property.propertyName || ''}${property.propertyName && property.projectName ? ', ' : ''}${property.projectName || ''}, at ${property.address?.locality || ''}, ${property.address?.city || ''}. This ready-to-move-in residential apartment offers a built-up area of ${property.buildupArea || ''} ${property.unit || 'sqft'} and a carpet area of ${property.carpetArea || ''} ${property.unit || 'sqft'}. The ${property.propertyFacing?.toLowerCase() || ''}-facing flat is thoughtfully designed with ${property.totalRooms || ''} rooms and ${property.totalBathrooms || ''} bathrooms, ideal for modern living. Enjoy a host of premium amenities including ${property.amenities?.join(', ') || ''}. With ${property.viewFromProperty?.join(', ') || ''} and excellent ventilation, the apartment is part of a ${property.reraApproved ? 'RERA-approved' : ''} property, promising peace of mind and investment safety. Perfectly suited for families seeking comfort and convenience in the heart of ${property.address?.state || ''}`.replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/\.;/g, '.').replace(/\.,/g, '.').replace(/\.,/g, '.').replace(/\.,/g, '.').trim();
  }

  private static truncateAtWord(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    const truncated = text.substr(0, maxLength);
    return truncated.substr(0, truncated.lastIndexOf(' ')) + '...';
  }

  public static async generate(property: Property): Promise<{ title: string; description: string }> {
    try {
      const title = await this.generateTitle(property);
      const description = await this.generateDescription(property);

      // Fallback if ML output is too short
      if (!title || title.split(' ').length < 7) {
        return {
          title: this.ruleBasedTitle(property),
          description: this.ruleBasedDescription(property)
        };
      }
      if (!description || description.split(' ').length < 30) {
        return {
          title,
          description: this.ruleBasedDescription(property)
        };
      }
      return { title, description };
    } catch (error) {
      return {
        title: this.ruleBasedTitle(property),
        description: this.ruleBasedDescription(property)
      };
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

    const y_titles = trainingData.map(data => 
      this.padSequence(this.tokenizer.tokenize(data.title), this.MAX_TITLE_LENGTH)
    );
    const y_descriptions = trainingData.map(data => 
      this.padSequence(this.tokenizer.tokenize(data.description), this.MAX_DESCRIPTION_LENGTH)
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