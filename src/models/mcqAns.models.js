import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// Model Definitions
const answerSchema = new Schema({
    userAnswer: {
        type: String,
        required: true,
    },
    isCorrect:{
        type:Boolean,
        required: true,
        default: false,
    }
}, { timestamps: true });

const mcqAnsSchema = new Schema({
    answers: [answerSchema],

    score:{
        type:Number,
        required: true,
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
    },
    
    mcqId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mcq",
        required: [true, "Mcq Id is required"],
    },
}, { timestamps: true });

mcqAnsSchema.plugin(mongooseAggregatePaginate);

export const McqAns = mongoose.model("McqAns", mcqAnsSchema);