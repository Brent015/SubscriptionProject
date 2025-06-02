import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Subscription name is required"],
        trim: true,
        minlength: [3, "Subscription name must be at least 3 characters long"],
        maxlength: [50, "Subscription name cannot exceed 50 characters"]
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"]
    },
    currency: {
        type: String,
        enum: ["USD", "EUR", "GBP", "PHP"], // Add more currencies as needed
        default: "PHP"
    },
    frequency: {
        type: String,
        enum: ["daily","weekly", "monthly", "yearly"],
        required: [true, "Frequency is required"]
    },
    category: {
        type: String,
        enum: ["basic", "premium", "enterprise"],
        required: [true, "Category is required"]
    },
    paymentMethod: {
        type: String,
        required: [true, "Payment method is required"],
        trim: true,
    },
    status: {
        type: String,
        enum: ["active", "inactive", "cancelled"],
        default: "active"
    },
    startDate: {
        type: Date,
        required: [true, "Start date is required"],
        validate: {
            validator: (value) => value <= new Date(),
            message: "Start date cannot be in the future"
            },
    },
    renewalDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
              return value > this.startDate;
            }, 
            message: "Renewal date must be after the start date",
        }
}, 
user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    index : true
}
}, {timestamps: true});

subscriptionSchema.pre("save", function(next) {
    if(!this.renewalDate) {
        const frequencyMap = {
            daily: 1,
            weekly: 7,
            monthly: 30,
            yearly: 365
        };

        this.renewalDate = new Date(this.startDate);
        this.renewalDate.setDate(this.renewalDate.getDate() + renewalPeriods[this.frequency]);
    }

    if (this.renewalDate < new Date()) {
        this.status = "inactive";
    }
    next();
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;