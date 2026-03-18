import Joi from "joi";

const userScheme = Joi.object({
  name: Joi.string().min(3).max(50).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
}).options({
  // Inputs sanitization
  stripUnknown: true, // Removes undefined keys in the scheme
  abortEarly: false, // Optional, to have every error together
});

export const validateUser = (req, res, next) => {
  const { error, value } = userScheme.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 400,
      message: error.details[0].message,
    });
  }
  req.body = value; // Use the clean version of Joi
  next();
};
