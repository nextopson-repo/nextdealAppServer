import express from 'express';
import nsfwDetectionService from './nsfwDetectionService';
import { ServiceResponse } from '../../common/models/serviceResponse';
import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/predict', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(ServiceResponse.failure('No image uploaded'));
    }

    const imageBuffer = req.file.buffer;
    const prediction = await nsfwDetectionService.predict(imageBuffer);
    return res.json(ServiceResponse.success(prediction));
  } catch (error) {
    console.error('NSFW prediction error:', error);
    return res.status(500).json(ServiceResponse.failure('Error processing image'));
  }
});

export default router;