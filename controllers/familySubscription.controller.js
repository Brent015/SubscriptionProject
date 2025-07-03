import FamilySubscription from "../models/familySubscription.model.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import crypto from 'crypto';
import { sendFamilyInviteEmail } from "../utils/send-email.js";

// Create family subscription
export const createFamilySubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.body;
        
        // Check if subscription exists and belongs to user
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found"
            });
        }
        
        if (subscription.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only create family subscription for your own subscriptions"
            });
        }
        
        // Check if subscription is active
        if (subscription.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: "Can only create family subscription for active subscriptions"
            });
        }
        
        // Check if family subscription already exists
        const existingFamily = await FamilySubscription.findOne({ subscription: subscriptionId });
        if (existingFamily) {
            return res.status(409).json({
                success: false,
                message: "Family subscription already exists for this subscription"
            });
        }
        
        const familySubscription = await FamilySubscription.create({
            subscription: subscriptionId,
            owner: req.user._id
        });
        
        await familySubscription.populate([
            { path: 'subscription', select: 'name price currency frequency category' },
            { path: 'owner', select: 'name email' }
        ]);
        
        res.status(201).json({
            success: true,
            message: "Family subscription created successfully",
            data: familySubscription
        });
        
    } catch (error) {
        next(error);
    }
};

// Get family subscription details
export const getFamilySubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        
        const familySubscription = await FamilySubscription.findOne({ 
            subscription: subscriptionId 
        }).populate([
            { path: 'subscription', select: 'name price currency frequency category status' },
            { path: 'owner', select: 'name email' },
            { path: 'members.user', select: 'name email' }
        ]);
        
        if (!familySubscription) {
            return res.status(404).json({
                success: false,
                message: "Family subscription not found"
            });
        }
        
        // Check if user has access (owner or member)
        if (!familySubscription.hasAccess(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You don't have access to this family subscription"
            });
        }
        
        res.status(200).json({
            success: true,
            data: familySubscription
        });
        
    } catch (error) {
        next(error);
    }
};

// Invite family member
export const inviteFamilyMember = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }
        
        // Find family subscription
        const familySubscription = await FamilySubscription.findOne({ 
            subscription: subscriptionId 
        }).populate('subscription owner');

        if (!familySubscription) {
            return res.status(404).json({
                success: false,
                message: "Family subscription not found"
            });
        }
        
        // Check if user is the owner
        if (!familySubscription.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the subscription owner can invite family members"
            });
        }
        
        // Check if max members limit reached
        if (familySubscription.getActiveMembersCount() >= familySubscription.maxMembers) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${familySubscription.maxMembers} family members allowed`
            });
        }
        
        // Find user by email
        const inviteeUser = await User.findOne({ email }).select('-password');
        if (!inviteeUser) {
            return res.status(404).json({
                success: false,
                message: "User with this email not found"
            });
        }
        
        // Check if user is trying to invite themselves
        if (inviteeUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot invite yourself"
            });
        }
        
        // Check if user is already a member or has pending invite
        const existingMember = familySubscription.members.find(
            member => member.user.toString() === inviteeUser._id.toString()
        );
        
        if (existingMember) {
            if (existingMember.status === 'active') {
                return res.status(409).json({
                    success: false,
                    message: "User is already an active family member"
                });
            }
            if (existingMember.status === 'pending') {
                return res.status(409).json({
                    success: false,
                    message: "Invitation already sent to this user"
                });
            }
        }
        
        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        
        

        // Add member to family subscription
        familySubscription.members.push({
            user: inviteeUser._id,
            status: 'pending',
            inviteToken,
            inviteExpiresAt
        });
        
        await familySubscription.save();
        
        // Send invitation email
        try {
            await sendFamilyInviteEmail({
                to: email,
                inviteeUser,
                ownerUser: familySubscription.owner,
                subscription: familySubscription.subscription,
                inviteToken,
                expiresAt: inviteExpiresAt
            });
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // Continue with success response even if email fails
        }
        
        res.status(200).json({
            success: true,
            message: "Family invitation sent successfully",
            data: {
                invitedUser: {
                    name: inviteeUser.name,
                    email: inviteeUser.email
                },
                expiresAt: inviteExpiresAt
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// Accept family invitation
export const acceptFamilyInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;
        
        const familySubscription = await FamilySubscription.findOne({
            'members.inviteToken': token,
            'members.inviteExpiresAt': { $gt: new Date() }
        }).populate([
            { path: 'subscription', select: 'name price currency frequency category' },
            { path: 'owner', select: 'name email' }
        ]);
        
        if (!familySubscription) {
            return res.status(404).json({
                success: false,
                message: "Invalid or expired invitation token"
            });
        }
        
        // Find the member with this token
        const memberIndex = familySubscription.members.findIndex(
            member => member.inviteToken === token
        );
        
        if (memberIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found"
            });
        }
        
        const member = familySubscription.members[memberIndex];
        
        // Check if the authenticated user is the one invited
        if (member.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only accept your own invitations"
            });
        }
        
        // Check if already accepted
        if (member.status === 'active') {
            return res.status(400).json({
                success: false,
                message: "Invitation already accepted"
            });
        }
        
        // Accept invitation
        familySubscription.members[memberIndex].status = 'active';
        familySubscription.members[memberIndex].inviteToken = undefined;
        familySubscription.members[memberIndex].inviteExpiresAt = undefined;
        
        await familySubscription.save();
        
        res.status(200).json({
            success: true,
            message: "Family invitation accepted successfully",
            data: {
                subscription: familySubscription.subscription,
                owner: familySubscription.owner
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// Remove family member
export const removeFamilyMember = async (req, res, next) => {
    try {
        const { subscriptionId, memberId } = req.params;
        
        const familySubscription = await FamilySubscription.findOne({ 
            subscription: subscriptionId 
        });
        
        if (!familySubscription) {
            return res.status(404).json({
                success: false,
                message: "Family subscription not found"
            });
        }
        
        // Check if user is the owner
        if (!familySubscription.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the subscription owner can remove family members"
            });
        }
        
        // Find and remove member
        const memberIndex = familySubscription.members.findIndex(
            member => member.user.toString() === memberId
        );
        
        if (memberIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Family member not found"
            });
        }
        
        familySubscription.members[memberIndex].status = 'removed';
        await familySubscription.save();
        
        res.status(200).json({
            success: true,
            message: "Family member removed successfully"
        });
        
    } catch (error) {
        next(error);
    }
};

// Leave family subscription (for members)
export const leaveFamilySubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        
        const familySubscription = await FamilySubscription.findOne({ 
            subscription: subscriptionId 
        });
        
        if (!familySubscription) {
            return res.status(404).json({
                success: false,
                message: "Family subscription not found"
            });
        }
        
        // Check if user is a member (not owner)
        if (familySubscription.isOwner(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: "Subscription owner cannot leave. Delete the family subscription instead."
            });
        }
        
        // Find member
        const memberIndex = familySubscription.members.findIndex(
            member => member.user.toString() === req.user._id.toString() && 
                     member.status === 'active'
        );
        
        if (memberIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "You are not an active member of this family subscription"
            });
        }
        
        familySubscription.members[memberIndex].status = 'removed';
        await familySubscription.save();
        
        res.status(200).json({
            success: true,
            message: "Successfully left family subscription"
        });
        
    } catch (error) {
        next(error);
    }
};

// Delete family subscription (owner only)
export const deleteFamilySubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        
        const familySubscription = await FamilySubscription.findOne({ 
            subscription: subscriptionId 
        });
        
        if (!familySubscription) {
            return res.status(404).json({
                success: false,
                message: "Family subscription not found"
            });
        }
        
        // Check if user is the owner
        if (!familySubscription.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the subscription owner can delete family subscription"
            });
        }
        
        await FamilySubscription.findByIdAndDelete(familySubscription._id);
        
        res.status(200).json({
            success: true,
            message: "Family subscription deleted successfully"
        });
        
    } catch (error) {
        next(error);
    }
};

// Get user's family subscriptions (as owner or member)
export const getUserFamilySubscriptions = async (req, res, next) => {
    try {
        // Find subscriptions where user is owner
        const ownedFamilySubscriptions = await FamilySubscription.find({
            owner: req.user._id,
            isActive: true
        }).populate([
            { path: 'subscription', select: 'name price currency frequency category status' },
            { path: 'members.user', select: 'name email' },
            {path: 'owner', select: 'name email' }
        ]);
        
        // Find subscriptions where user is a member
        const memberFamilySubscriptions = await FamilySubscription.find({
            'members.user': req.user._id,
            'members.status': 'active',
            isActive: true
        }).populate([
            { path: 'subscription', select: 'name price currency frequency category status' },
            { path: 'owner', select: 'name email' }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                owned: ownedFamilySubscriptions,
                member: memberFamilySubscriptions
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// Check if user has access to subscription (for middleware)
export const checkSubscriptionAccess = async (subscriptionId, userId) => {
    try {
        // First check if user owns the subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (subscription && subscription.user.toString() === userId.toString()) {
            return { hasAccess: true, accessType: 'owner' };
        }
        
        // Then check if user has family access
        const familySubscription = await FamilySubscription.findOne({ 
            subscription: subscriptionId,
            isActive: true
        });
        
        if (familySubscription && familySubscription.hasAccess(userId)) {
            const accessType = familySubscription.isOwner(userId) ? 'owner' : 'member';
            return { hasAccess: true, accessType, familySubscription };
        }
        
        return { hasAccess: false, accessType: null };
    } catch (error) {
        console.error('Error checking subscription access:', error);
        return { hasAccess: false, accessType: null };
    }
};