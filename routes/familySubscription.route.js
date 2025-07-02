import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import {
    createFamilySubscription,
    getFamilySubscription,
    inviteFamilyMember,
    acceptFamilyInvitation,
    removeFamilyMember,
    leaveFamilySubscription,
    deleteFamilySubscription,
    getUserFamilySubscriptions
} from "../controllers/familySubscription.controller.js";

const familySubscriptionRouter = Router();

// All routes require authentication
familySubscriptionRouter.use(authorize);

// Get user's family subscriptions (as owner or member)
familySubscriptionRouter.get("/", getUserFamilySubscriptions);

// Accept family invitation (public route with token)
familySubscriptionRouter.post("/accept/:token", acceptFamilyInvitation);

// Create family subscription for a specific subscription
familySubscriptionRouter.post("/:subscriptionId", createFamilySubscription);

// Get family subscription details
familySubscriptionRouter.get("/:subscriptionId", getFamilySubscription);

// Invite family member
familySubscriptionRouter.post("/:subscriptionId/invite", inviteFamilyMember);

// Remove family member (owner only)
familySubscriptionRouter.delete("/:subscriptionId/members/:memberId", removeFamilyMember);

// Leave family subscription (member only)
familySubscriptionRouter.post("/:subscriptionId/leave", leaveFamilySubscription);

// Delete family subscription (owner only)
familySubscriptionRouter.delete("/:subscriptionId", deleteFamilySubscription);

export default familySubscriptionRouter;