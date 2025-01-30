import { Router } from "express";

import { deleteMcq, editMcqTitle, generateMCQ, getGenaretedMcqByCurrentuser, getMcq, getMcqAnsById, postMcqAns, searchGenaretedMcqByCurrentuser } from "../controllers/chat.controllers.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyUsersEmailVerifyed } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

// Open Route

// secure route

chatRouter.route("/mcq/post").post(upload.fields([
    {
        name: "topicPdf",
        maxCount: 1
    }
]),verifyUsersEmailVerifyed,generateMCQ);

chatRouter.route("/mcq/current").post(verifyUsersEmailVerifyed,getGenaretedMcqByCurrentuser);

chatRouter.route("/mcq/current/search").post(verifyUsersEmailVerifyed,searchGenaretedMcqByCurrentuser);

chatRouter.route("/mcq").post(verifyUsersEmailVerifyed,getMcq);

chatRouter.route("/mcq/edit").post(verifyUsersEmailVerifyed,editMcqTitle);

chatRouter.route("/mcq/delete").post(verifyUsersEmailVerifyed,deleteMcq);

chatRouter.route("/answer").post(verifyUsersEmailVerifyed,postMcqAns);

chatRouter.route("/answersByMcqId").post(verifyUsersEmailVerifyed,getMcqAnsById);

export default chatRouter;