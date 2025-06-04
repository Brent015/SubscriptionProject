import Subscription from "../models/subscription.model.js";
import {upstashWorkflowClient as workflowClient} from "../config/upstash.js";

export const createSubscription = async (req, res, next) => {
    try{
        const subscription = await Subscription.create({
            ...req.body,
            user: req.user._id,
        });

       const { workflowRunId } = await workflowClient.trigger({
            url: `${SERVER_URL}/api/v1/workflow/subscriptions/reminder`,
            body: {
                subscriptionId: subscription._id,
            },
            headers: {
                "Content-Type": "application/json",
            },
            retries: 0,
        });

        res.status(201).json({ success: true, data: subscription, workflowRunId });
    }catch (e) {
    next(e);
    }
}
export const getUserSubscriptions = async (req, res, next) => {
    try{
        if(req.user.id.toString() !== req.params.id) {
            const error = new Error("Pashnea not your Account");
            error.statusCode = 401;
            throw error;
        }

        const subscriptions = await Subscription.find({ user: req.params.id });

        res.status(200).json({
            success: true,
            data: subscriptions
        });

    } catch (e) {
        next(e);
    }
}