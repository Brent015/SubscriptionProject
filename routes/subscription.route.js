import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import { 
    createSubscription, 
    getUserSubscriptions, 
    getAllSubscriptions,
    getSubscriptionById,
    updateSubscription,
    deleteSubscription,
    cancelSubscription, 
    getAllUsersWithSubscriptions,
    getSubscriptionStatistics,
    adminSearchSubscriptions
} from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

// All routes require authentication
subscriptionRouter.use(authorize);

// IMPORTANT: More specific routes MUST come before parameterized routes
// Admin routes (most specific first)
subscriptionRouter.get("/admin/search", requireAdmin, adminSearchSubscriptions);
subscriptionRouter.get("/admin/users", requireAdmin, getAllUsersWithSubscriptions);
subscriptionRouter.get("/admin/statistics", requireAdmin, getSubscriptionStatistics);

// User-specific routes (specific patterns)
subscriptionRouter.get("/user/:id", getUserSubscriptions);
subscriptionRouter.get("/renewals/upcoming", async (req, res, next) => {
    try {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const upcomingRenewals = await Subscription.find({
            user: req.user._id,
            status: 'active',
            renewalDate: { $lte: threeDaysFromNow }
        }).sort({ renewalDate: 1 });

        res.status(200).json({
            success: true,
            message: `Found ${upcomingRenewals.length} upcoming renewal(s)`,
            data: upcomingRenewals
        });
    } catch (e) {
        next(e);
    }
});

// General routes
subscriptionRouter.get("/", getAllSubscriptions);

// Parameterized routes (MUST come last)
subscriptionRouter.get("/:id", getSubscriptionById);

// POST create new subscription
subscriptionRouter.post("/", createSubscription);

// PUT update subscription
subscriptionRouter.put("/:id", updateSubscription);

// DELETE subscription
subscriptionRouter.delete("/:id", deleteSubscription);

// PUT cancel subscription (change status to cancelled)
subscriptionRouter.put("/:id/cancel", cancelSubscription);

export default subscriptionRouter;