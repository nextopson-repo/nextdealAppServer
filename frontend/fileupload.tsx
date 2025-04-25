/**
 * FileUpload Component
 * 
 * A React Native component for handling file uploads to AWS S3 using pre-signed URLs.
 * 
 * Setup Requirements:
 * 1. Install dependencies:
 *    ```bash
 *    npm install react-native-image-picker
 *    npm install react-native-dotenv
 *    npm install -D @types/react-native-image-picker
 *    ```
 * 
 * 2. Add to your .env file:
 *    ```
 *    API_BASE_URL=http://localhost:5000  # Your backend API URL
 *    ```
 * 
 * 3. Configure babel.config.js:
 *    ```javascript
 *    module.exports = {
 *      presets: ['module:metro-react-native-babel-preset'],
 *      plugins: [
 *        ['module:react-native-dotenv']
 *      ],
 *    };
 *    ```
 * 
 * Usage Example:
 * ```typescript
 * import FileUpload from './fileupload';
 * 
 * const MyScreen = () => {
 *   const handleUploadComplete = (fileKey: string) => {
 *     console.log('File uploaded with key:', fileKey);
 *     // Store fileKey in your database or use it to retrieve the file
 *   };
 * 
 *   return (
 *     <FileUpload
 *       onUploadComplete={handleUploadComplete}
 *       onError={(error) => console.error(error)}
 *     />
 *   );
 * };
 * ```
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import { API_BASE_URL } from '@env';

/**
 * Props for the FileUpload component
 * @property {Function} onUploadComplete - Callback function called when upload is successful, receives the file key
 * @property {Function} onError - Callback function called when an error occurs during upload
 */
interface FileUploadProps {
  onUploadComplete?: (fileKey: string) => void;
  onError?: (error: string) => void;
}

/**
 * Response structure from the backend API for upload URL generation
 */
interface UploadResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    url: string;     // Pre-signed URL for S3 upload
    key: string;     // File key in S3 bucket
    expiresIn: number; // URL expiration time in seconds
  };
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError }) => {
  // Track upload state and preview image
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  /**
   * Generates a pre-signed URL for S3 upload
   * @param fileName - Name of the file to be uploaded
   * @param fileType - MIME type of the file
   * @returns Promise<UploadResponse>
   */
  const generateUploadUrl = async (fileName: string, fileType: string): Promise<UploadResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/s3/imgtokey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: fileName,
          contentType: fileType,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  };

  /**
   * Uploads a file directly to S3 using pre-signed URL
   * @param url - Pre-signed S3 URL
   * @param file - File blob to upload
   * @param contentType - MIME type of the file
   */
  const uploadToS3 = async (url: string, file: any, contentType: string) => {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!response.ok) {
        throw new Error('Upload to S3 failed');
      }
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  /**
   * Extracts file extension from URI
   * @param uri - File URI
   * @returns string - File extension (defaults to 'jpg')
   */
  const getFileExtension = (uri: string): string => {
    const matches = uri.match(/\.(\w+)$/);
    return matches ? matches[1].toLowerCase() : 'jpg';
  };

  /**
   * Maps file extensions to MIME types
   * @param extension - File extension
   * @returns string - MIME type
   */
  const getMimeType = (extension: string): string => {
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[extension] || 'image/jpeg';
  };

  /**
   * Handles file selection using image picker
   * Opens image picker and triggers upload process
   */
  const handleFilePick = async () => {
    const options: ImagePicker.ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
    };

    try {
      const result = await ImagePicker.launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Error picking image');
      }

      if (result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        const uri = selectedAsset.uri;
        
        if (!uri) {
          throw new Error('No image URI available');
        }

        setImagePreview(uri);
        await handleUpload(uri);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      onError?.(error instanceof Error ? error.message : 'Error picking file');
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  /**
   * Handles the file upload process
   * 1. Generates unique filename
   * 2. Gets pre-signed URL
   * 3. Uploads file to S3
   * 4. Notifies parent component
   * 
   * @param uri - Local file URI
   */
  const handleUpload = async (uri: string) => {
    try {
      setUploading(true);

      // Generate a unique filename
      const extension = getFileExtension(uri);
      const fileName = `upload-${Date.now()}.${extension}`;
      const contentType = getMimeType(extension);

      // Get pre-signed URL
      const uploadUrlResponse = await generateUploadUrl(fileName, contentType);

      if (uploadUrlResponse.status !== 'success' || !uploadUrlResponse.data?.url) {
        throw new Error('Failed to get upload URL');
      }

      // Prepare file for upload
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to S3
      await uploadToS3(uploadUrlResponse.data.url, blob, contentType);

      // Notify parent component
      onUploadComplete?.(uploadUrlResponse.data.key);

      Alert.alert('Success', 'File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      onError?.(error instanceof Error ? error.message : 'Error uploading file');
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Render component
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handleFilePick}
        disabled={uploading}
      >
        <Text style={styles.uploadButtonText}>
          {uploading ? 'Uploading...' : 'Select File'}
        </Text>
      </TouchableOpacity>

      {/* Show loading indicator during upload */}
      {uploading && (
        <ActivityIndicator style={styles.loader} size="large" color="#0000ff" />
      )}

      {/* Show image preview if available */}
      {imagePreview && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imagePreview }} style={styles.preview} />
        </View>
      )}
    </View>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  previewContainer: {
    marginTop: 20,
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default FileUpload; 