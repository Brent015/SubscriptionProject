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
export const deleteUser = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const userId = req.params.id;
        
        // Check if user is trying to delete their own account or if they're an admin
        if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
            const error = new Error("Unauthorized: You can only delete your own account");
            error.statusCode = 403;
            throw error;
        }

        // Find the user to delete
        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            const error = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }

        // Prevent admin from deleting themselves (optional safety check)
        if (userToDelete.role === 'admin' && req.user._id.toString() === userId) {
            const error = new Error("Admin cannot delete their own account");
            error.statusCode = 400;
            throw error;
        }

        // Delete all subscriptions associated with this user
        await Subscription.deleteMany({ user: userId }, { session });
        
        // Delete the user
        await User.findByIdAndDelete(userId, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "User and associated data deleted successfully"
        });
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};
