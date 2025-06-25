import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {JWT_EXPIRES_IN} from "../config/env.js";

// Hash password
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password
export const comparePasswords = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Throw HTTP error
export const throwError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};
