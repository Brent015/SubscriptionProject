import { emailTemplates } from "./email-template.js";
import dayjs from "dayjs";
import transporter, { accountEmail } from "../config/nodemailer.js";

export const sendReminderEmail = async ({to, type, subscription}) => {
    if(!to || !type) throw new Error("Missing required parameters");
    
    const template = emailTemplates.find((t)=> t.label === type);

    if(!template) throw new Error("Invalid email type");

    const mailInfo = {
        userName: subscription.user.name,
        subscriptionName: subscription.name,
        renewalDate: dayjs(subscription.renewalDate).format("MMMM D, YYYY"),
        planName: subscription.category, // Use category instead of subscription.plan.name
        price: `${subscription.currency} ${subscription.price} (${subscription.frequency})`,
        paymentMethod: subscription.paymentMethod,
        accountSettingsLink: "#", // Add proper links
        supportLink: "#", // Add proper links
    }

    const message = template.generateBody(mailInfo);
    const subject = template.generateSubject(mailInfo);

    const mailOptions = {
        from: accountEmail,
        to: to,
        subject: subject,
        html: message,
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.response}`);
        return info;
    } catch (error) {
        console.log(error, "Error sending email");
        throw error;
    }
}
// FAMILY SUBsCRIPTION INVITE EMAIL TEMPLATE

export const generateFamilyInviteTemplate = ({
    inviteeName,
    ownerName,
    subscriptionName,
    planName,
    price,
    acceptInviteLink,
    expiresAt,
}) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
            <td style="background-color: #e74c3c; text-align: center; color: white; padding: 30px;">
                <p style="font-size: 54px; line-height: 54px; font-weight: 800; margin: 0;">SubDub</p>
                <p style="font-size: 18px; margin: 10px 0 0 0;">Family Subscription Invitation</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background-color: #ff6b6b; color: white; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 20px;">👨‍👩‍👧‍👦</div>
                </div>
                
                <h2 style="text-align: center; color: #e74c3c; margin-bottom: 25px;">You're Invited to Join!</h2>
                
                <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #e74c3c;">${inviteeName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 25px;"><strong>${ownerName}</strong> has invited you to join their family subscription for <strong>${subscriptionName}</strong>! This means you'll get access to all the same great features at no cost to you.</p>
                
                <table cellpadding="15" cellspacing="0" border="0" width="100%" style="background-color: #fff5f5; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #e74c3c;">
                    <tr>
                        <td>
                            <h3 style="margin: 0 0 15px 0; color: #e74c3c;">Subscription Details:</h3>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>Service:</strong> ${subscriptionName}</p>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>Plan:</strong> ${planName}</p>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>Value:</strong> ${price}</p>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>Shared by:</strong> ${ownerName}</p>
                        </td>
                    </tr>
                </table>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${acceptInviteLink}" style="background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
                        🎉 Accept Invitation
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                        ⏰ <strong>Important:</strong> This invitation expires on <strong>${expiresAt}</strong>. Make sure to accept it before then!
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    <strong>What this means:</strong><br>
                    • You'll have full access to ${subscriptionName}<br>
                    • No additional cost to you<br>
                    • You can leave the family plan anytime<br>
                    • ${ownerName} remains the account owner
                </p>
                
                <p style="font-size: 16px; margin-top: 30px;">
                    Best regards,<br>
                    <strong>The SubDub Team</strong>
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666;">
                <p style="margin: 0 0 10px;">
                    SubDub Inc. | 123 Main St, Anytown, AN 12345
                </p>
                <p style="margin: 0;">
                    If you didn't expect this invitation, you can safely ignore this email.
                </p>
            </td>
        </tr>
    </table>
</div>
`;

// family subscription invite email function
export const sendFamilyInviteEmail = async ({
    to,
    inviteeUser,
    ownerUser,
    subscription,
    inviteToken,
    expiresAt
}) => {
    if (!to || !inviteToken) throw new Error("Missing required parameters");
    
    const acceptInviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/family/accept/${inviteToken}`;
    
    const mailInfo = {
        inviteeName: inviteeUser.name,
        ownerName: ownerUser.name,
        subscriptionName: subscription.name,
        planName: subscription.category,
        price: `${subscription.currency} ${subscription.price} (${subscription.frequency})`,
        acceptInviteLink,
        expiresAt: new Date(expiresAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    const message = generateFamilyInviteTemplate(mailInfo);
    const subject = `🎉 You're invited to join ${ownerUser.name}'s ${subscription.name} family subscription!`;

    const mailOptions = {
        from: accountEmail,
        to: to,
        subject: subject,
        html: message,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Family invitation email sent: ${info.response}`);
        return info;
    } catch (error) {
        console.log(error, "Error sending family invitation email");
        throw error;
    }
};