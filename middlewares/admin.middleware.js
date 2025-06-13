export const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admin access required. You don't have permission to access this resource."
            });
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error in admin check",
            error: error.message
        });
    }
};