import User from "../models/user.model.js";
import { hashPassword, comparePasswords, generateToken, throwError } from "../utils/helper.js";
import { withTransaction } from "../middlewares/auth.middleware.js";
import { ADMIN_CREATION_KEY } from "../config/env.js";


// SIGN UP
export const signUp = withTransaction(async (req, res, _next, session) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email })) throwError("User already exists", 409);

  const hashed = await hashPassword(password);

  const [newUser] = await User.create(
    [{ name, email, password: hashed }],
    { session }
  );

  const token = generateToken(newUser._id);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: { token, user: newUser },
  });
});

// SIGN IN
export const signIN = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throwError("Email and password are required", 400);

    const user = await User.findOne({ email });
    if (!user) throwError("Invalid email", 401);

    const valid = await comparePasswords(password, user.password);
    if (!valid) throwError("Invalid password", 401);

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email },
      },
    });
  } catch (error) {
    next(error);
  }
};

// SIGN OUT
export const signOut = (_req, res, _next) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// CREATE ADMIN
export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, adminKey } = req.body;

    if (adminKey !== ADMIN_CREATION_KEY) {
      return res.status(403).json({ success: false, message: "Invalid admin creation key" });
    }

    if (await User.findOne({ email })) throwError("User already exists", 409);

    const hashed = await hashPassword(password);

    const adminUser = await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
    });

    const token = generateToken(adminUser._id);

    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      data: {
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
