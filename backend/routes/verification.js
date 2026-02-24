const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const cron = require('node-cron');

const verificationService = require('../services/verificationService');
const documentService = require('../services/documentService');
const complianceService = require('../services/complianceService');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { validateVerificationRequest } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @swagger
 * /api/verify:
 *   post:
 *     summary: Verify a land title deed document
 *     description: Upload a document image for AI-powered verification analysis
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Document image file
 *     responses:
 *       200:
 *         description: Verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 result:
 *                   $ref: '#/components/schemas/VerificationResult'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/', authenticateToken, upload.single('image'), validateVerificationRequest, async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    logger.info(`Verification request received for user ${userId}, file: ${file.filename}`);

    // Preprocess the image
    const processedImagePath = await preprocessImage(file.path);
    
    // Create verification record
    const verificationRecord = await documentService.createVerificationRecord({
      userId,
      originalFileName: file.originalname,
      uploadedFileName: file.filename,
      processedImagePath,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    // Perform AI verification
    const aiResult = await verificationService.verifyDocument(processedImagePath);

    // Update verification record with AI results
    await documentService.updateVerificationRecord(verificationRecord.id, {
      aiResult,
      status: 'completed'
    });

    // Log compliance event
    await complianceService.logVerificationEvent({
      userId,
      verificationId: verificationRecord.id,
      documentType: 'land_deed',
      result: aiResult.isVerified ? 'verified' : 'fraud_detected',
      confidence: aiResult.confidence
    });

    // Clean up temporary files
    await cleanupFiles([file.path, processedImagePath]);

    res.json({
      success: true,
      message: 'Verification completed successfully',
      result: {
        isVerified: aiResult.isVerified,
        fraudScore: Math.round((1 - aiResult.confidence) * 100),
        confidence: aiResult.confidence,
        analysisReasons: aiResult.analysisReasons,
        documentDetails: aiResult.documentDetails
      }
    });

  } catch (error) {
    logger.error('Verification error:', error);
    
    // Clean up files on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Error cleaning up file:', unlinkError);
      }
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during verification'
    });
  }
});

/**
 * @swagger
 * /api/verify/status/{id}:
 *   get:
 *     summary: Get verification status
 *     description: Retrieve the status and results of a verification request
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification record ID
 *     responses:
 *       200:
 *         description: Verification status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 verification:
 *                   $ref: '#/components/schemas/VerificationRecord'
 *       404:
 *         description: Verification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/status/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const verification = await documentService.getVerificationById(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification record not found'
      });
    }

    // Check if user owns this verification
    if (verification.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    logger.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/verify/history:
 *   get:
 *     summary: Get verification history
 *     description: Retrieve verification history for the authenticated user
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Verification history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VerificationRecord'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const history = await documentService.getUserVerificationHistory(userId, limit, offset);
    const total = await documentService.getUserVerificationCount(userId);

    res.json({
      success: true,
      history,
      pagination: {
        total,
        limit,
        offset
      }
    });

  } catch (error) {
    logger.error('Error getting verification history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/verify/batch:
 *   post:
 *     summary: Verify multiple documents
 *     description: Upload and verify multiple document images in a single request
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Batch verification completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       result:
 *                         $ref: '#/components/schemas/VerificationResult'
 *       400:
 *         description: Bad request
 */
router.post('/batch', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const results = [];
    const filePaths = [];

    for (const file of files) {
      try {
        // Preprocess image
        const processedImagePath = await preprocessImage(file.path);
        filePaths.push(file.path, processedImagePath);

        // Create verification record
        const verificationRecord = await documentService.createVerificationRecord({
          userId,
          originalFileName: file.originalname,
          uploadedFileName: file.filename,
          processedImagePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          batchId: uuidv4()
        });

        // Perform verification
        const aiResult = await verificationService.verifyDocument(processedImagePath);

        // Update record
        await documentService.updateVerificationRecord(verificationRecord.id, {
          aiResult,
          status: 'completed'
        });

        results.push({
          filename: file.originalname,
          result: {
            isVerified: aiResult.isVerified,
            fraudScore: Math.round((1 - aiResult.confidence) * 100),
            confidence: aiResult.confidence,
            analysisReasons: aiResult.analysisReasons
          }
        });

      } catch (error) {
        logger.error(`Error processing file ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    // Clean up files
    await cleanupFiles(filePaths);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    logger.error('Batch verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during batch verification'
    });
  }
});

// Helper functions
async function preprocessImage(imagePath) {
  const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.jpg');
  
  try {
    await sharp(imagePath)
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    logger.error('Image preprocessing error:', error);
    throw new Error('Failed to preprocess image');
  }
}

async function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn(`Failed to cleanup file: ${filePath}`, error);
    }
  }
}

module.exports = router;