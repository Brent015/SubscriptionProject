import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
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

        subscription.status = "cancelled";
        
         const cancelSubscription = await Subscription.findByIdAndUpdate(
            subscription._id,
            {status:"cancelled"},
            { new: true, runValidators: true })

        res.status(200).json({
            success: true,
            message: "Subscription cancelled successfully",
            data: cancelSubscription
        });
    } catch (e) {
        next(e);
    }
}

// Admin only - get all users with subscriptions
export const getAllUsersWithSubscriptions = async (req, res, next) => {
    try {
        const subscriptions = await Subscription.find({})
            .populate('user', 'name email role')
            .select('name price status renewalDate user category frequency');
        
        const usersWithSubscriptions = subscriptions.reduce((acc, sub) => {
            const userId = sub.user._id.toString();
            if (!acc[userId]) {
                acc[userId] = {
                    user: {
                        id: sub.user._id,
                        name: sub.user.name,
                        email: sub.user.email,
                        role: sub.user.role
                    },
                    subscriptions: []
                };
            }
            acc[userId].subscriptions.push({
                id: sub._id,
                name: sub.name,
                price: sub.price,
                status: sub.status,
                renewalDate: sub.renewalDate,
                category: sub.category,
                frequency: sub.frequency
            });
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            message: `Found ${Object.keys(usersWithSubscriptions).length} users with subscriptions`,
            data: Object.values(usersWithSubscriptions),
            totalUsers: Object.keys(usersWithSubscriptions).length,
            totalSubscriptions: subscriptions.length
        });
    } catch (e) {
        next(e);
    }
};

// Admin only - get subscription statistics
export const getSubscriptionStatistics = async (req, res, next) => {
    try {
        const stats = await Subscription.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalRevenue: { $sum: "$price" }
                }
            }
        ]);

        const totalUsers = await User.countDocuments();
        const usersWithSubscriptions = (await Subscription.distinct("user")).length;

        res.status(200).json({
            success: true,
            data: {
                subscriptionStats: stats,
                totalUsers,
                usersWithSubscriptions,
                usersWithoutSubscriptions: totalUsers - usersWithSubscriptions
            }
        });
    } catch (e) {
        next(e);
    }
};

// Admin search - allows admins to search across all users' subscriptions
export const adminSearchSubscriptions = async (req, res, next) => {
    try {
        // Validate query parameters
          const allowedParams = [
  'category', 'status', 'paymentMethod', 'currency', 'frequency',
  'minPrice', 'maxPrice', 'startDate', 'endDate',
  'renewalStartDate', 'renewalEndDate', 'userId', 'userEmail',
  'page', 'limit', 'sortBy', 'sortOrder'
];

const invalidParams = Object.keys(req.query).filter(
  (key) => !allowedParams.includes(key)
);

if (invalidParams.length > 0) {
  return res.status(400).json({
    success: false,
    message: `Invalid query parameter(s): ${invalidParams.join(', ')}`
  });
}

        const {
            category,
            status, 
            paymentMethod,
            currency,
            frequency,
            minPrice,
            maxPrice,
            startDate,
            endDate,
            renewalStartDate,
            renewalEndDate,
            userId,
            userEmail,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let searchQuery = {};

        // Simple field filters (direct match or user field)
        const simpleFilters = [
            { field: 'user', value: userId },
        ];

        // Array/single value filters (support both array and single values)
        const arrayFilters = [
            { field: 'category', value: category },
            { field: 'status', value: status },
            { field: 'currency', value: currency },
            { field: 'frequency', value: frequency }
        ];

        // Regex filters (case-insensitive search)
        const regexFilters = [
            { field: 'paymentMethod', value: paymentMethod }
        ];

        // Range filters
        const rangeFilters = [
            {
                field: 'price',
                min: minPrice,
                max: maxPrice,
                parser: parseFloat
            },
            {
                field: 'startDate',
                min: startDate,
                max: endDate,
                parser: (val) => new Date(val)
            },
            {
                field: 'renewalDate',
                min: renewalStartDate,
                max: renewalEndDate,
                parser: (val) => new Date(val)
            }
        ];

        // Apply simple filters
        simpleFilters.forEach(({ field, value }) => {
            if (value) {
                searchQuery[field] = value;
            }
        });

        // Apply array/single value filters
        arrayFilters.forEach(({ field, value }) => {
            if (value) {
                searchQuery[field] = Array.isArray(value) ? { $in: value } : value;
            }
        });

        // Apply regex filters
        regexFilters.forEach(({ field, value }) => {
            if (value) {
                searchQuery[field] = { $regex: value, $options: 'i' };
            }
        });

        // Apply range filters
        rangeFilters.forEach(({ field, min, max, parser }) => {
            if (min !== undefined || max !== undefined) {
                searchQuery[field] = {};
                if (min !== undefined) {
                    searchQuery[field].$gte = parser(min);
                }
                if (max !== undefined) {
                    searchQuery[field].$lte = parser(max);
                }
            }
        });
       
        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Sorting
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Build aggregation pipeline for user email search
        let pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                //exclude password from lookup
                    pipeline: [
                        { $project: { password: 0 } } // Exclude password field
                    ]
                }
            },
            { $unwind: "$user" } //para maging single object lang instead of array
        ];

        // Add email filter if provided
        if (userEmail) {
            pipeline.push({
                $match: {
                    "user.email": { $regex: userEmail, $options: 'i' }  //regex is used to search,match or manipulate strings using patterns
                }
            });
        }

        // Add other filters
        if (Object.keys(searchQuery).length > 0) {
            pipeline.push({ $match: searchQuery });
        }

        // Add sorting
        pipeline.push({ $sort: sortObj });

        // Add pagination
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limitNum });

        // Execute the search
        const subscriptions = await Subscription.aggregate(pipeline);

        // Get total count
        const countPipeline = [...pipeline.slice(0, -2)]; // Remove skip and limit
        countPipeline.push({ $count: "total" });
        const totalResult = await Subscription.aggregate(countPipeline);
        const totalCount = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalCount / limitNum);

        res.status(200).json({
            success: true,
            message: `Found ${subscriptions.length} subscription(s) matching admin search criteria`,
            data: {
                subscriptions,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1,
                    limit: limitNum
                }
            }
        });

    } catch (e) {
        next(e);
    }
};