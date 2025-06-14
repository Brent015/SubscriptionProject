import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
    type: String,
    required: [true, "Username is required"],
    trim: true,
    minlength: [3, "Username must be at least 3 characters long"],
    maxlength: [30, "Username cannot exceed 30 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"] 

     },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
    
   },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    }
  },
{timestamps: true});

const User = mongoose.model("User", userSchema);

export default User;