import express from 'express';
import { TemplateController } from '../controllers/templateController.js';
import { validateRequest, validateParams, templateValidation } from '../validation/schemas.js';

const router = express.Router();
const templateController = new TemplateController();

// GET /api/templates - Get all templates
router.get('/', templateController.getAllTemplates);

// GET /api/templates/:id - Get specific template
router.get('/:id', 
  validateParams(templateValidation.params),
  templateController.getTemplateById
);

// POST /api/templates - Create new template
router.post('/', 
  validateRequest(templateValidation.create),
  templateController.createTemplate
);

// PUT /api/templates/:id - Update template
router.put('/:id', 
  validateParams(templateValidation.params),
  validateRequest(templateValidation.update),
  templateController.updateTemplate
);

// DELETE /api/templates/:id - Delete template
router.delete('/:id', 
  validateParams(templateValidation.params),
  templateController.deleteTemplate
);

// GET /api/templates/:id/preview - Preview template
router.get('/:id/preview', 
  validateParams(templateValidation.params),
  templateController.previewTemplate
);

export default router;
