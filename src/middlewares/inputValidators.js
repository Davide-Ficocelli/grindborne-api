import Joi from "joi";

function createValidator(scheme) {
  return (req, res, next) => {
    const { error, value } = scheme.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 400,
        message: error.details[0].message,
      });
    }
    req.body = value; // Use the clean version of Joi
    next();
  };
}

// Input sanitization object's options
const inputSanitizationOptions = {
  stripUnknown: true, // Removes undefined keys in the scheme
  abortEarly: false, // Optional, to have every error together
};

// Scheme for user creation
const newUserScheme = Joi.object({
  name: Joi.string().min(3).max(50).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Scheme fo user update
const updatedUserScheme = Joi.object({
  name: Joi.string().min(3).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  level: Joi.number().optional(),
  stamina: Joi.number().optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Scheme for input user credentials
const userCredentialScheme = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Scheme for attribute creation
const newAttributeScheme = Joi.object({
  name: Joi.string().lowercase().trim().required(),
  description: Joi.string().lowercase().trim().optional(),
  icon: Joi.optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Scheme for attribute update
const updatedAttributeScheme = Joi.object({
  name: Joi.string().lowercase().trim().optional(),
  description: Joi.string().lowercase().trim().optional(),
  icon: Joi.optional(),
  level: Joi.number().optional(),
  xp: Joi.number().optional(),
}).options(
  // Inputs sanitization
  inputSanitizationOptions,
);

// Validators

// Validates user upon creation
export const validateNewUser = createValidator(newUserScheme);
// Validates user upon update
export const validateUpdatedUser = createValidator(updatedUserScheme);
// Validates user credentials upon attempted login
export const validateUserCredentials = createValidator(userCredentialScheme);
// Validates attribute upon creation
export const validateNewAttribute = createValidator(newAttributeScheme);
// Validates attribute upon update
export const validateUpdatedAttribute = createValidator(updatedAttributeScheme);
