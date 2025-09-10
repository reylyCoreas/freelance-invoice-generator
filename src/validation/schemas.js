import Joi from 'joi';

// Common validation patterns
const uuidSchema = Joi.string().uuid();
const emailSchema = Joi.string().email();
const dateSchema = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const currencySchema = Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD');
const statusSchema = Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled');

// Address validation
export const addressSchema = Joi.object({
  street: Joi.string().allow(''),
  city: Joi.string().allow(''),
  state: Joi.string().allow(''),
  zip: Joi.string().allow(''),
  country: Joi.string().allow('')
});

// Client validation schemas
export const clientValidation = {
  create: Joi.object({
    name: Joi.string().required().min(1).max(255),
    email: emailSchema.required(),
    phone: Joi.string().allow('').max(50),
    address: addressSchema.optional(),
    company: Joi.string().allow('').max(255),
    taxId: Joi.string().allow('').max(100),
    paymentTerms: Joi.number().integer().min(0).max(365).default(30),
    currency: currencySchema.default('USD'),
    notes: Joi.string().allow('').max(1000)
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(255),
    email: emailSchema,
    phone: Joi.string().allow('').max(50),
    address: addressSchema,
    company: Joi.string().allow('').max(255),
    taxId: Joi.string().allow('').max(100),
    paymentTerms: Joi.number().integer().min(0).max(365),
    currency: currencySchema,
    notes: Joi.string().allow('').max(1000)
  }).min(1), // At least one field must be present

  params: Joi.object({
    id: uuidSchema.required()
  })
};

// Invoice line item validation
export const lineItemSchema = Joi.object({
  description: Joi.string().required().min(1).max(255),
  details: Joi.string().allow('').max(500),
  quantity: Joi.number().positive().required(),
  rate: Joi.number().positive().required(),
  total: Joi.number().optional() // Will be calculated
});

// Invoice validation schemas
export const invoiceValidation = {
  create: Joi.object({
    clientId: uuidSchema.required(),
    invoiceNumber: Joi.string().max(50).optional(), // Will be generated if not provided
    issueDate: dateSchema.optional(), // Defaults to today
    dueDate: dateSchema.optional(), // Will be calculated from payment terms
    paymentTerms: Joi.number().integer().min(0).max(365).default(30),
    items: Joi.array().items(lineItemSchema).min(1).required(),
    taxRate: Joi.number().min(0).max(1).default(0.08),
    discountAmount: Joi.number().min(0).default(0),
    currency: currencySchema.default('USD'),
    notes: Joi.string().allow('').max(1000),
    templateId: Joi.string().default('default'),
    status: statusSchema.default('draft')
  }),

  update: Joi.object({
    clientId: uuidSchema,
    invoiceNumber: Joi.string().max(50),
    issueDate: dateSchema,
    dueDate: dateSchema,
    paymentTerms: Joi.number().integer().min(0).max(365),
    items: Joi.array().items(lineItemSchema).min(1),
    taxRate: Joi.number().min(0).max(1),
    discountAmount: Joi.number().min(0),
    currency: currencySchema,
    notes: Joi.string().allow('').max(1000),
    templateId: Joi.string(),
    status: statusSchema
  }).min(1),

  params: Joi.object({
    id: uuidSchema.required()
  }),

  query: Joi.object({
    clientId: uuidSchema.optional(),
    status: statusSchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'issueDate', 'dueDate', 'total', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  statusUpdate: Joi.object({
    status: statusSchema.required()
  })
};

// Template validation schemas
export const templateValidation = {
  create: Joi.object({
    name: Joi.string().required().min(1).max(100),
    description: Joi.string().allow('').max(500),
    htmlContent: Joi.string().required().min(1),
    cssContent: Joi.string().allow('').max(50000),
    isDefault: Joi.boolean().default(false)
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100),
    description: Joi.string().allow('').max(500),
    htmlContent: Joi.string().min(1),
    cssContent: Joi.string().allow('').max(50000),
    isDefault: Joi.boolean()
  }).min(1),

  params: Joi.object({
    id: Joi.string().required() // Allow both UUID and string IDs like 'default'
  })
};

// User validation schemas (for authentication)
export const userValidation = {
  register: Joi.object({
    email: emailSchema.required(),
    password: Joi.string().min(8).max(128).required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      }),
    name: Joi.string().required().min(1).max(100),
    businessInfo: Joi.object({
      name: Joi.string().max(255),
      email: emailSchema,
      phone: Joi.string().max(50),
      address: addressSchema,
      taxId: Joi.string().max(100),
      website: Joi.string().uri().allow('')
    }).optional()
  }),

  login: Joi.object({
    email: emailSchema.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(1).max(100),
    businessInfo: Joi.object({
      name: Joi.string().max(255),
      email: emailSchema,
      phone: Joi.string().max(50),
      address: addressSchema,
      taxId: Joi.string().max(100),
      website: Joi.string().uri().allow('')
    }),
    settings: Joi.object({
      defaultCurrency: currencySchema,
      defaultTaxRate: Joi.number().min(0).max(1),
      defaultPaymentTerms: Joi.number().integer().min(0).max(365),
      emailNotifications: Joi.boolean(),
      autoGenerateInvoiceNumbers: Joi.boolean()
    })
  }).min(1),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      })
  })
};

// Email validation schemas
export const emailValidation = {
  sendInvoice: Joi.object({
    to: Joi.alternatives().try(
      emailSchema,
      Joi.array().items(emailSchema).min(1)
    ).required(),
    cc: Joi.alternatives().try(
      emailSchema,
      Joi.array().items(emailSchema)
    ).optional(),
    bcc: Joi.alternatives().try(
      emailSchema,
      Joi.array().items(emailSchema)
    ).optional(),
    subject: Joi.string().max(200).optional(),
    message: Joi.string().max(2000).optional(),
    attachPdf: Joi.boolean().default(true)
  })
};

// General pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Middleware to validate request data
export const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

    // Replace the request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Middleware to validate query parameters
export const validateQuery = (schema) => validateRequest(schema, 'query');

// Middleware to validate URL parameters
export const validateParams = (schema) => validateRequest(schema, 'params');

// Export all validation functions
export default {
  client: clientValidation,
  invoice: invoiceValidation,
  template: templateValidation,
  user: userValidation,
  email: emailValidation,
  validateRequest,
  validateQuery,
  validateParams
};
