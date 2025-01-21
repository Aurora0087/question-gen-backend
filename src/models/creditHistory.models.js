import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const creditHistorySchema = new Schema({

    historyType:{
        type:String,
        enum: ["INCREASE", "DECREASE"],
        require: true,
    },

    pointValue:{
        type:Number,
        default: 0,
        required: true,
    },

    note:{
        type:String,
    },
    
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner is required"],
    },
}, { timestamps: true });

creditHistorySchema.plugin(mongooseAggregatePaginate);

export const CreditHistory = mongoose.model("CreditHistory", creditHistorySchema);