import mongoose, { Schema } from "mongoose";

const razorpayPaymentSuccess = new Schema({
    paymentId:{
        type:String,
        required: true,
    },
    method:{
        type:String,
        required: true,
    },
},{timestamps: true});

const paymentOrderSchema = new Schema({

    paymentGatway:{
        type:String,
        default: "RAZORPAY",
        required: true,
    },

    isPaid:{
        type:Boolean,
        default:false,
    },

    razorpayPaymentSuccess:razorpayPaymentSuccess,

    paymentGatwayOrderId:{
        type:String,
        required: true,
    },
    entity:{
        type:String,
        required: true,
    },

    tokensBuying:{
        type:Number,
        required: true,
    },

    amount:{
        type:Number,
        required: true,
    },
    amount_paid:{
        type:Number,
    },
    amount_due:{
        type:Number,
    },

    currency:{
        type:String,
    },
    status:{
        type:String,
    },
    paymentGatwayOrderCreated_at:{
        type:Number
    },
    receipt:{
        type:String
    },
    
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner is required"],
    },
}, { timestamps: true });

export const PaymentOrder = mongoose.model("PaymentOrder", paymentOrderSchema);