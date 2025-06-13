import { Router } from "express";  

import { signIN, signOut, signUp, createAdmin } from "../controllers/auth.controller.js";

import pkg from 'jsonwebtoken';


const { sign } = pkg;

const router = Router();

router.post("/sign-up",signUp);
router.post("/sign-in", signIN);
router.post("/sign-out", signOut);
router.post("/create-admin",createAdmin);
export default router;   