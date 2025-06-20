import jwt from "jsonwebtoken";
import {JWT_SECRET, JWT_EXPIRES_IN} from "../config/env.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

const authorize = async (req, res, next) => {
    try {
        let token;
        
        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access, no token provided"
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Decoded token:", decoded);

        // Find user and explicitly select the role field
        const user = await User.findById(decoded.userId).select("-password");
    
        console.log("User found in auth middleware:", user);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access, user not found"
            });
        }
        
        // Set the user object with all necessary fields including role
        req.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role // Make sure role is included
        };
        
        console.log("req.user set to:", req.user);
        next();
        
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({
            success: false,
            message: "Unauthorized access",
            error: error.message
        });
    }
};

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

export const withTransaction = (handler) => async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await handler(req, res, next, session);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export { authorize };