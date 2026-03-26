import { createNewAttributeService } from "../models/attributesModel.js";
import handleResponse from "../utils/handleResponse.js";

export const createNewAttribute = async (req, res, next) => {
  try {
    // Gets the input fields which will be inserted in the attributes table for the new record from the request body
    const { name, description, icon } = req.body;

    // Gets user's id for attributes_id field
    const userId = req.user.id;

    // Starts the attribute creation process with the appropriate async function created in the attributesModel.js file
    const newAttribute = await createNewAttributeService(
      name,
      description,
      icon,
      userId,
    );

    // Sends back a successfull response, status code and message if the new attribute is created with no issues
    handleResponse(res, 201, "Attribute created successfully", newAttribute);
  } catch (err) {
    next(err);
  }
};
