import Subscription from "../models/subscription.model.js";
import {upstashWorkflowClient as workflowClient} from "../config/upstash.js";
import { SERVER_URL } from "../config/env.js";

export const createSubscription = async (req, res, next) => {
    try{
        const subscription = await Subscription.create({
            ...req.body,
            user: req.user._id,
        });

        let workflowRunId = null;
        
        // Only trigger workflow if SERVER_URL is configured and server is accessible
        if (SERVER_URL) {
            try {
                const { workflowRunId: runId } = await workflowClient.trigger({
                    url: `${SERVER_URL}/api/v1/workflow/subscriptions/reminder`,
                    body: {
                        subscriptionId: subscription._id,
                    },
                    headers: {
                        "Content-Type": "application/json",
                    },
                    retries: 0,
                });
                workflowRunId = runId;
                console.log(`Workflow triggered successfully: ${workflowRunId}`);
            } catch (workflowError) {
                console.log('Workflow trigger failed (subscription still created):', workflowError.message);
                // Don't fail the entire request if workflow fails
            }
        } else {
            console.log('SERVER_URL not configured, skipping workflow trigger');
        }

        res.status(201).json({ 
            success: true, 
            message: "Subscription created successfully",
            data: subscription, 
            workflowRunId 
        });
    }catch (e) {
        next(e);
    }
}

export const getUserSubscriptions = async (req, res, next) => {
    try{
        if(req.user._id.toString() !== req.params.id) {
            const error = new Error("Unauthorized: Cannot access another user's subscriptions");
            error.statusCode = 403;
            throw error;
        }

        const subscriptions = await Subscription.find({ user: req.params.id });

        res.status(200).json({
            success: true,
            message: `Found ${subscriptions.length} subscription(s)`,
            data: subscriptions
        });

    } catch (e) {
        next(e);
    }
}

// Additional controller functions for better API
export const getAllSubscriptions = async (req, res, next) => {
    try {
        const subscriptions = await Subscription.find({ user: req.user._id }).populate('user', 'name email');
        
        res.status(200).json({
            success: true,
            message: `Found ${subscriptions.length} subscription(s)`,
            data: subscriptions
        });
    } catch (e) {
        next(e);
    }
}

export const getSubscriptionById = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id).populate('user', 'name email');
        
        if (!subscription) {
            const error = new Error("Subscription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check if subscription belongs to the authenticated user
        if (subscription.user._id.toString() !== req.user._id.toString()) {
            const error = new Error("Unauthorized: Cannot access another user's subscription");
            error.statusCode = 403;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: subscription
        });
    } catch (e) {
        next(e);
    }
}

export const updateSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        
        if (!subscription) {
            const error = new Error("Subscription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check if subscription belongs to the authenticated user
        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error("Unauthorized: Cannot update another user's subscription");
            error.statusCode = 403;
            throw error;
        }

        const updatedSubscription = await Subscription.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Subscription updated successfully",
            data: updatedSubscription
        });
    } catch (e) {
        next(e);
    }
}

export const deleteSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        
        if (!subscription) {
            const error = new Error("Subscription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check if subscription belongs to the authenticated user
        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error("Unauthorized: Cannot delete another user's subscription");
            error.statusCode = 403;
            throw error;
        }

        await Subscription.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Subscription deleted successfully"
        });
    } catch (e) {
        next(e);
    }
}

export const cancelSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        
        if (!subscription) {
            const error = new Error("Subscription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check if subscription belongs to the authenticated user
        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error("Unauthorized: Cannot cancel another user's subscription");
            error.statusCode = 403;
            throw error;
        }

        subscription.status = 'cancelled';
        await subscription.save();

        res.status(200).json({
            success: true,
            message: "Subscription cancelled successfully",
            data: subscription
        });
    } catch (e) {
        next(e);
    }
}