import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// Model Definitions
const questionSchema = new Schema({
    question: {
        type: String,
        required: true,
    },
    options: {
        type: [String],
    },
    correct_answer: {
        type: String,
        required: true,
    }
}, { timestamps: true });

const mcqSchema = new Schema({
    topic: {
        type: String,
        required: true,
    },
    questions: [questionSchema],

    isPublic:{
        type: Boolean,
        required: true,
        default: false,
    },
    
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner is required"],
    },
}, { timestamps: true });

mcqSchema.plugin(mongooseAggregatePaginate);

export const Mcq = mongoose.model("Mcq", mcqSchema);