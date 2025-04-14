import { Router } from 'express';

import { getHello } from '../../controllers/helloController';

const router = Router();

/**
 * @swagger
 * /api/v1/hello:
 *   get:
 *     summary: Get a hello message from NextDeal
 *     description: Returns a simple hello message with a timestamp
 *     tags: [Hello]
 *     responses:
 *       200:
 *         description: Hello message successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Hello from NextDeal
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-04-07T12:00:00.000Z
 */
router.get('/', getHello);

export default router;
