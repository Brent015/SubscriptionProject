import { Router } from "express";

import {authorize} from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import { getUser, getUsers, deleteUser } from "../controllers/user.controller.js";

const userRouter = Router();

// Admin-only route - get all users (auth + admin check)
userRouter.get("/", authorize, requireAdmin, getUsers);

// Regular authenticated route - get specific user
userRouter.get("/:id", authorize, getUser);

userRouter.post("/", (req, res) => res.send("CREATE new users"));

userRouter.put("/:id", (req, res) => res.send("UPDATE users"));

// Delete user (hard delete - permanently removes user and data)
// FIXED: Removed the duplicate placeholder route
userRouter.delete("/:id", authorize, deleteUser);

export default userRouter;