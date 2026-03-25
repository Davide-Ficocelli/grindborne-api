import { createAttributeService } from "../models/attributesModel.js";
import handleResponse from "../utils/handleResponse.js";

export const createAttribute = async (req, res, next) => {
  try {
    const { users_id, name, description, icon } = req.body;

    const newUser = await createAttributeService(
      users_id,
      name,
      description,
      icon,
    );
    handleResponse(res, 201, "Attribute created successfully", newUser);
  } catch (err) {
    next(err);
  }
};
