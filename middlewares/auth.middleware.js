import {JWT_SECRET} from "../config/env.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

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