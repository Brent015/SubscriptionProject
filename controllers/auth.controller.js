import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ADMIN_CREATION_KEY } from "../config/env.js";

import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";

export const signUp = async (req, res, next) => {
        const session = await mongoose.startSession();  
        session.startTransaction();

    try{

        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if(existingUser){
            const error = new Error("User already exists");
            error.statusCode = 409;
            throw error;

        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser =await User.create([{
            name,
            email,
            password: hashedPassword
        }], { session });

        const token = jwt.sign(
            { userId: newUser[0]._id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        console.log(newUser[0]);


        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message : "User created successfully",
            data: {
                token,
                user: newUser[0],
            }
        });
    } catch (error) {
        session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const signIN = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            const error = new Error("Email and password muna tsong");
            error.statusCode = 400;
            throw error;
        }

        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error("Mali email Par");
            error.statusCode = 401;
            throw error;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            const error = new Error("Mali Password Par");
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                }
            }
        });
    } catch (error) {
     next(error);
    }
};

export const signOut = async (_req, _res, _next) => {
        try {
        _res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
    _next(error);
    }

};

// for admin use
export const createAdmin = async (req, res, next) => {
    try {
        const { name, email, password, adminKey } = req.body;
        
        // Add a secret admin key check
        if (adminKey !== process.env.ADMIN_CREATION_KEY) {
            return res.status(403).json({
                success: false,
                message: "Invalid admin creation key"
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const adminUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin"
        });

        const token = jwt.sign(
            { userId: adminUser._id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: "Admin user created successfully",
            data: {
                token,
                user: {
                    id: adminUser._id,
                    name: adminUser.name,
                    email: adminUser.email,
                    role: adminUser.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

