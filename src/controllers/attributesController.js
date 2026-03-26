import {
  createNewAttributeService,
  getAttributesByUserIdService,
  deleteAttributeService,
} from "../models/attributesModel.js";
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

// Returns all of the corrispective user's attributes
export const getAttributesByUserId = async (req, res, next) => {
  try {
    // Gets user id
    const userId = req.user.id;

    // Retrieves and saves all user's attributes
    const userAttributes = await getAttributesByUserIdService(userId);

    // If no attributes are returned send back an error message
    if (!userAttributes)
      return handleResponse(res, 404, "No attributes were found for this user");

    // Return attributes if no issues occured
    handleResponse(
      res,
      200,
      "All user attributes successfully retrieved",
      userAttributes,
    );
  } catch (err) {
    next(err);
  }
};

// Deletes an attribute
export const deleteAttribute = async (req, res, next) => {
  try {
    const deletedAttribute = await deleteAttributeService(req.params.id);
    if (!deletedAttribute)
      return handleResponse(res, 404, "Attribute not found");
    handleResponse(
      res,
      200,
      "Attribute deleted successfully",
      deletedAttribute,
    );
  } catch (err) {
    next(err);
  }
};
