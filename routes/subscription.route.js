import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import { createSubscription, getUserSubscriptions, getAllSubscriptions,getSubscriptionById,updateSubscription,deleteSubscription,cancelSubscription, getAllUsersWithSubscriptions} from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

// All routes require authentication
subscriptionRouter.use(authorize);

// GET all subscriptions for the authenticated user
subscriptionRouter.get("/", getAllSubscriptions);

// GET specific subscription by ID
subscriptionRouter.get("/:id", getSubscriptionById);

//GET all users with subscription
subscriptionRouter.get("/users/all", requireAdmin, getAllUsersWithSubscriptions);

// POST create new subscription
subscriptionRouter.post("/", createSubscription);

// PUT update subscription
subscriptionRouter.put("/:id", updateSubscription);

// DELETE subscription
subscriptionRouter.delete("/:id", deleteSubscription);

// GET subscriptions for a specific user (keeping your original route)
subscriptionRouter.get("/user/:id", getUserSubscriptions);

// PUT cancel subscription (change status to cancelled)
subscriptionRouter.put("/:id/cancel", cancelSubscription);

// GET upcoming renewals for the authenticated user
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

export default subscriptionRouter;