import User from "../models/user.model.js";

export const getUsers = async (req, res, next) => {
    try {
       const users = await User.find().select("-password");

       res.status(200).json({
           success: true,
           data: users
       });

    } catch (error) {
        next(error);
    }
}

export const getUser = async (req, res, next) => {
    try {
       // Check if user is trying to access their own profile or if they're an admin
       if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
           const error = new Error("Unauthorized: You can only access your own profile");
           error.statusCode = 403;
           throw error;
       }

       const user = await User.findById(req.params.id).select("-password");
       if (!user) {
           const error = new Error("User not found");
           error.statusCode = 404;
           throw error;
       }

       res.status(200).json({
           success: true,
           data: user
       });

    } catch (error) {
        next(error);
    }
}