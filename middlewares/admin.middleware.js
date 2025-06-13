export const requireAdmin = (req, res, next) => {
    try {
        console.log("Admin middleware - req.user:", req.user);
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        console.log("User role:", req.user.role);

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admin access required. You don't have permission to access this resource."
            });
        }

        console.log("Admin access granted");
        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Server error in admin check",
            error: error.message
        });
    }
};