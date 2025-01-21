import { Router } from "express";

import { deleteMcq, generateMCQ, getGenaretedMcqByCurrentuser, getMcq, getMcqAnsById, postMcqAns } from "../controllers/chat.controllers.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyUsersEmailVerifyed } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

// Open Route

// close route

chatRouter.route("/mcq/post").post(upload.fields([
    {
        name: "topicPdf",
        maxCount: 1
    }
]),verifyUsersEmailVerifyed,generateMCQ);

chatRouter.route("/mcq/current").post(verifyUsersEmailVerifyed,getGenaretedMcqByCurrentuser);

chatRouter.route("/mcq").post(verifyUsersEmailVerifyed,getMcq);

chatRouter.route("/mcq/delete").post(verifyUsersEmailVerifyed,deleteMcq);

chatRouter.route("/answer").post(verifyUsersEmailVerifyed,postMcqAns);

chatRouter.route("/answersByMcqId").post(verifyUsersEmailVerifyed,getMcqAnsById);

export default chatRouter;