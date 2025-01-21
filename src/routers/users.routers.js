import { Router } from "express";
import {
    registerUser,
    verifyEmail,
    loginUser,
    logOut,
    googleAuthLOginRegister,
    incomingRefreshToken,
    changePassword,
    forgotPasswordEmail,
    forgotPassword,
    currentUserDetails,
    changeUsername,
    currentUsersCreditHistory,
    sendEmailtoVerifyAcc,
} from "../controllers/user.controllers.js";

import { getUserDetails, verifyJWT } from "../middlewares/auth.middleware.js";


const userRouter = Router();

// Open Route

userRouter.route("/register").post(registerUser);

userRouter.route("/verify").post(verifyEmail);

userRouter.route("/login").post(loginUser);

userRouter.route("/auth/google").post(googleAuthLOginRegister);

userRouter.route("/refreshToken").get(incomingRefreshToken);

userRouter.route("/email/forgotPassword").post(forgotPasswordEmail);

userRouter.route("/forgotPassword").post(forgotPassword);

// verifyed route

userRouter.route("/logout").get(verifyJWT,logOut);

userRouter.route("/sendVerifyEmail").post(getUserDetails,sendEmailtoVerifyAcc);

userRouter.route("/changePassword").post(verifyJWT,changePassword);

userRouter.route("/changeUsername").post(verifyJWT,changeUsername);

userRouter.route("/currentuser").get(verifyJWT,currentUserDetails);

userRouter.route("/currentuser/credit/history").post(verifyJWT,currentUsersCreditHistory);


export default userRouter;