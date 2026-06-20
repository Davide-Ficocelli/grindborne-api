import { type Request } from "express";

export interface AuthPayload {
  id: string;
}

export interface AuthRequest extends Request {
  user: AuthPayload;
}
