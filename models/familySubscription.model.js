import mongoose from "mongoose";

const familySubscriptionSchema = new mongoose.Schema({
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        required: [true, "Subscription ID is required"],
        
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner ID is required"],
        index: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["pending", "active", "removed"],
            default: "pending"
        },
        inviteToken: {
            type: String,
            unique: true,
            sparse: true // Allow multiple null values
        },
        inviteExpiresAt: {
            type: Date
        }
    }],
    maxMembers: {
        type: Number,
        default: 5,
        max: [5, "Maximum 5 family members allowed"]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Compound index to ensure one family subscription per subscription
familySubscriptionSchema.index({ subscription: 1 }, { unique: true });

// Pre-save middleware to validate member count
familySubscriptionSchema.pre('save', function(next) {
    const activeMembers = this.members.filter(member => member.status === 'active');
    
    if (activeMembers.length > this.maxMembers) {
        const error = new Error(`Cannot have more than ${this.maxMembers} active family members`);
        error.statusCode = 400;
        return next(error);
    }
    
    next();
});

// Method to get active members count
familySubscriptionSchema.methods.getActiveMembersCount = function() {
    return this.members.filter(member => member.status === 'active').length;
};

// Method to check if user is a member
familySubscriptionSchema.methods.isMember = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString() && 
        member.status === 'active'
    );
};

// Method to check if user is owner
familySubscriptionSchema.methods.isOwner = function(userId) {
    const ownerId = this.owner._id || this.owner;
    return ownerId.toString() === userId.toString();
};

// Method to check if user has access (owner or active member)
familySubscriptionSchema.methods.hasAccess = function(userId) {
    return this.isOwner(userId) || this.isMember(userId);
};

const FamilySubscription = mongoose.model("FamilySubscription", familySubscriptionSchema);

export default FamilySubscription;