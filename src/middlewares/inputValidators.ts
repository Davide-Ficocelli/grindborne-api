import Joi, { type Schema } from "joi";
import { type Request, type Response, type NextFunction } from "express";

// - Input validation setup -

// Creates a new validator from schema as input
function createValidator(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 400,
        message: error.details[0]?.message ?? "Invalid input",
      });
    }
    req.body = value; // Use the clean version of Joi
    next();
  };
}

// Input sanitization object's options
const inputSanitizationOptions = {
  stripUnknown: true, // Removes undefined keys in the schema
  abortEarly: false, // Optional, to have every error together
};

// --- SCHEMAS ---

// Schema for user creation
const newUserSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Schema fo user update
const updatedUserSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  level: Joi.number().optional(),
  stamina: Joi.number().optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Schema for input user credentials
const userCredentialSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Schema for attribute creation
const newAttributeSchema = Joi.object({
  name: Joi.string().lowercase().trim().required(),
  description: Joi.string().lowercase().trim().optional(),
  icon: Joi.optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Schema for attribute update
const updatedAttributeSchema = Joi.object({
  name: Joi.string().lowercase().trim().optional(),
  description: Joi.string().lowercase().trim().optional(),
  icon: Joi.optional(),
  level: Joi.number().optional(),
  xp: Joi.number().optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Schema for new quest creation
const newQuestSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  icon: Joi.optional(),
  total_xp: Joi.number().optional(),
  is_rewardable: Joi.boolean().required(),
  is_tracked: Joi.boolean().required(),
  tracked_at: Joi.date().optional(),
  is_completed: Joi.boolean().required(),
  estimated_time: Joi.number().optional(),
  attributes_ids: Joi.array().optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Schema for quest update
const updatedQuestSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  icon: Joi.optional(),
  total_xp: Joi.number().optional(),
  is_rewardable: Joi.boolean().optional(),
  is_tracked: Joi.boolean().optional(),
  tracked_at: Joi.date().optional(),
  is_completed: Joi.boolean().optional(),
  estimated_time: Joi.number().optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// --- VALIDATORS ---

// Validates user upon creation
export const validateNewUser = createValidator(newUserSchema);
// Validates user upon update
export const validateUpdatedUser = createValidator(updatedUserSchema);
// Validates user credentials upon attempted login
export const validateUserCredentials = createValidator(userCredentialSchema);
// Validates attribute upon creation
export const validateNewAttribute = createValidator(newAttributeSchema);
// Validates attribute upon update
export const validateUpdatedAttribute = createValidator(updatedAttributeSchema);
// Validates quest upon creation
export const validateNewQuest = createValidator(newQuestSchema);
// Validates quest upon update
export const validateUpdatedQuest = createValidator(updatedQuestSchema);
