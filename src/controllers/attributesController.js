import { createAttributeService } from "../models/attributesModel.js";
import handleResponse from "../utils/handleResponse.js";

export const createAttribute = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    const newAttribute = await createAttributeService(name, description, icon);
    handleResponse(res, 201, "Attribute created successfully", newAttribute);
  } catch (err) {
    next(err);
  }
};
