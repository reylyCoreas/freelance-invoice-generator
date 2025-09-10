import express from 'express';
import { TemplateController } from '../controllers/templateController.js';

const router = express.Router();
const templateController = new TemplateController();

// GET /api/templates - Get all templates
router.get('/', templateController.getAllTemplates);

// GET /api/templates/:id - Get specific template
router.get('/:id', templateController.getTemplateById);

// POST /api/templates - Create new template
router.post('/', templateController.createTemplate);

// PUT /api/templates/:id - Update template
router.put('/:id', templateController.updateTemplate);

// DELETE /api/templates/:id - Delete template
router.delete('/:id', templateController.deleteTemplate);

// GET /api/templates/:id/preview - Preview template
router.get('/:id/preview', templateController.previewTemplate);

export default router;
