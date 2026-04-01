import { type Request } from "express";

export interface AuthPayload {
  id: number;
}

export interface AuthRequest extends Request {
  user: AuthPayload;
}
