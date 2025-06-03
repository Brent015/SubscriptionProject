import jwt from "jsonwebtoken";
import {JWT_SECRET} from "../config/env.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";    

const authorize = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized access, no token provided"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(decoded);

        const user = await User.findOne({ _id: decoded.userId });
    
        console.log(user, "user found in auth middleware");

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized access, user not found"
            });
        }
        
        req.user = user;
        next();
        
    } catch (error) {
        res.status(401).json({
            message: "Unauthorized access",
            error: error.message
        });
    }
};

export { authorize };