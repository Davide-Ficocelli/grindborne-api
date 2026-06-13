import handleResponse from "./handleResponse.ts";
import { type Response, type NextFunction } from "express";
import type ServiceValidation from "../types/serviceValidation.ts";

const processServiceRequest = async (
  res: Response,
  next: NextFunction,
  servicePromise: Promise<ServiceValidation>,
) => {
  try {
    const { ok, status, message, data } = await servicePromise;
    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

export default processServiceRequest;
