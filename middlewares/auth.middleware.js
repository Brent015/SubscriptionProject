import {JWT_SECRET} from "../config/env.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { checkSubscriptionAccess } from "../controllers/familySubscription.controller.js";


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

// Middleware to check if user has access to a subscription (either as owner or family member)
export const requireSubscriptionAccess = async (req, res, next) => {
  try {
    const subscriptionId = req.params.subscriptionId || req.params.id;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID is required"
      });
    }

    const accessCheck = await checkSubscriptionAccess(subscriptionId, req.user._id);
    
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this subscription. You must be the owner or a family member."
      });
    }

    // Add access information to request object for use in controllers
    req.subscriptionAccess = {
      accessType: accessCheck.accessType, // 'owner' or 'member'
      familySubscription: accessCheck.familySubscription
    };

    next();
  } catch (error) {
    console.error('Subscription access check error:', error);
    res.status(500).json({
      success: false,
      message: "Error checking subscription access",
      error: error.message
    });
  }
};

// Middleware to check if user is the subscription owner (not just family member)
export const requireSubscriptionOwner = async (req, res, next) => {
  try {
    const subscriptionId = req.params.subscriptionId || req.params.id;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID is required"
      });
    }

    const accessCheck = await checkSubscriptionAccess(subscriptionId, req.user._id);
    
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this subscription."
      });
    }

    if (accessCheck.accessType !== 'owner') {
      return res.status(403).json({
        success: false,
        message: "Only subscription owners can perform this action."
      });
    }

    // Add access information to request object for use in controllers
    req.subscriptionAccess = {
      accessType: accessCheck.accessType,
      familySubscription: accessCheck.familySubscription
    };

    next();
  } catch (error) {
    console.error('Subscription owner check error:', error);
    res.status(500).json({
      success: false,
      message: "Error checking subscription ownership",
      error: error.message
    });
  }
};

// Optional: Middleware to check if user is a family member (not owner)
export const requireFamilyMember = async (req, res, next) => {
  try {
    const subscriptionId = req.params.subscriptionId || req.params.id;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID is required"
      });
    }

    const accessCheck = await checkSubscriptionAccess(subscriptionId, req.user._id);
    
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this subscription."
      });
    }

    if (accessCheck.accessType !== 'member') {
      return res.status(403).json({
        success: false,
        message: "This action is only available to family members."
      });
    }

    // Add access information to request object for use in controllers
    req.subscriptionAccess = {
      accessType: accessCheck.accessType,
      familySubscription: accessCheck.familySubscription
    };

    next();
  } catch (error) {
    console.error('Family member check error:', error);
    res.status(500).json({
      success: false,
      message: "Error checking family member status",
      error: error.message
    });
  }
};
