import mongoose, { Schema } from "mongoose";

const creditSchema = new Schema({

    point:{
        type:Number,
        default: 10,
        required: true,
    },
    
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner is required"],
    },
}, { timestamps: true });

export const Credit = mongoose.model("Credit", creditSchema);