import { User } from "../models/user.models.js";

import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { sendForgotPassword, sendVerificationEmail } from "../utils/mails.js";

import jwt from "jsonwebtoken";
import { ForgotPassword } from "../models/ForgotPassword.models.js";
import { getUser } from "../utils/appWrite.js";
import { Credit } from "../models/credit.models.js";
import mongoose from "mongoose";
import { CreditHistory } from "../models/creditHistory.models.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// httpcokie
const cookieOption = {
  httpOnly: true,
  secure: true,
  expires: new Date(Date.now() + 3 * 30 * 24 * 3600000),
};

// funtion for generateTokens and save in db

async function generateAccessTokenAndRefreshToken(uid) {
  try {
    const user = await User.findById(uid);

    const accesToken = await user.generateAccessToken();

    const refreshToken = await user.generateRefreshToken();

    // set new refreshToken in user db

    user.refreshToken = refreshToken;

    user.lastOnline = Date.now();

    await user.save({ validateBeforeSave: false });

    return { accesToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Somthing went wrong while generating token.");
  }
}

// genaret email varify token

function genaretEmailVerifyCode() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let emailVerificationToken = "";

  for (let i = 0; i < 20; i++) {
    emailVerificationToken += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return emailVerificationToken;
}

// register new user

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (
    [email, username, password].some((fild) => String(fild).trim().length < 1)
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "All Filds are Require."));
  }

  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Invalid email address."));
  }

  // cheack user exist with email yes{return user exist} no{next}

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    return res
      .status(409)
      .json(new ApiResponse(409, {}, "User with email already exist."));
  }

  // genaret email varify token

  const emailVerificationToken = genaretEmailVerifyCode();

  // register user

  const createdUser = await User.create({
    avatar: "",
    username: username,
    email: email,
    password: password,
    emailVerificationToken: emailVerificationToken,
  });

  // add 10 credit in a new acc

  await Credit.create({
    owner: new mongoose.Types.ObjectId(createdUser._id || ""),
  });

  const newUser = await User.findById(createdUser._id).select(
    "-password -refreshToken -emailVerificationToken -role "
  );

  if (!newUser) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "Somthing want wrong while registering new user."
        )
      );
  }

  // sent varification email to email address

  const mailRes = await sendVerificationEmail(
    email,
    emailVerificationToken,
    newUser._id
  );

  // give response

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newUser,
        "User Registered sccessfully. We also send a email to verify Your Account."
      )
    );
});

// send email for verifying acc

const sendEmailtoVerifyAcc = asyncHandler(async (req, res) => {

  if (req.user) {

    const user = await User.findById(req.user._id);

    // check is uses email already verifyed
    if (user.isEmailVerified) {
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Your Account already verifyed."));
    }

    const emailVerificationToken = genaretEmailVerifyCode();

    user.emailVerificationToken = emailVerificationToken;

    user.save();

    await sendVerificationEmail(
      user.email,
      emailVerificationToken,
      user._id
    );

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email send."));

  }

  return res
    .status(403)
    .json(new ApiResponse(403, {}, "Login using Your Account."));
});

// email verify

const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token;
  const uId = req.query.uId;

  if (!token || String(token).length < 10) {
    return res.status(400).json(new ApiResponse(400, {}, "Token not given."));
  }

  if (!uId || String(uId).length < 10) {
    return res.status(400).json(new ApiResponse(400, {}, "Uid not given."));
  }

  const user = await User.findById(uId);

  if (!user) {
    return res.status(404).json(new ApiResponse(404, {}, "User not found."));
  }

  const isSameToken = user.emailVerificationToken === token;

  if (!isSameToken) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Token is not correct."));
  }

  user.isEmailVerified = true;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verify succesfully."));
});

// login user

const loginUser = asyncHandler(async (req, res) => {
  //get email and password

  const { email, password } = req.body;

  //validate email and password

  if (!email || !password) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Email or Password not given properly."));
  }

  if ([email, password].some((fild) => String(fild).trim().length < 1)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Email or Password not given properly."));
  }

  //user exist with username or email

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json(new ApiResponse(404, {}, "User do not exist."));
  }

  if (user.loginType === "GOOGLE") {
    return res
      .status(403)
      .json(new ApiResponse(403, {}, "Login Using Google."));
  }

  //check password

  const isPasswordValid = await user.isPasswordCurrect(password);

  if (!isPasswordValid) {
    return res
      .status(401)
      .json(new ApiResponse(401, {}, "Password incorrect."));
  }

  //genarete tokens

  const { accesToken, refreshToken } = await generateAccessTokenAndRefreshToken(
    user._id
  );

  // get credit points

  const userCredit = await Credit.findOne({
    owner: new mongoose.Types.ObjectId(user._id),
  });

  //send token cookices

  return res
    .status(200)
    .cookie("accesToken", accesToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new ApiResponse(
        200,
        {
          userName: user.username,
            uid: user._id,
            avatar: user.avatar,
            userCredit: userCredit.point || 0,
            accesToken,
            refreshToken,
        },
        "User Login Successfully."
      )
    );
});

// google login or register

const googleAuthLOginRegister = asyncHandler(async (req, res) => {
  const { appwriteUserId, provider, email, name } = req.body;
  

  if (
    [appwriteUserId, provider, email, name].some(
      (fild) => String(fild).trim().length < 1
    )
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "All Filds are Require."));
  }

  const appWriteUser = await getUser(appwriteUserId);
  

  if (!appWriteUser) {
    return res.status(400).json(new ApiResponse(400, {}, "User not Found."));
  }

  if (appWriteUser.email !== email || appWriteUser.name !== name) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Fileds not given currectly."));
  }

  let user = await User.findOne({ email: appWriteUser.email });

  if (user) {
    // If user is registered with email/password
    if (user.loginType === "EMAIL_PASSWORD") {
      user.loginType = "GOOGLE";
      user.isEmailVerified = true;

      await user.save();
    }

    // get credit points

    const userCredit = await Credit.findOne({
      owner: new mongoose.Types.ObjectId(user._id),
    });

    //genarete tokens

    const { accesToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    //send token cookices

    return res
      .status(200)
      .cookie("accesToken", accesToken, cookieOption)
      .cookie("refreshToken", refreshToken, cookieOption)
      .json(
        new ApiResponse(
          200,
          {
            userName: user.username,
            uid: user._id,
            avatar: user.avatar,
            userCredit: userCredit.point || 0,
            accesToken,
            refreshToken,
          },
          "User Login Successfully."
        )
      );
  } else {
    // Register a new user if this is the first time they are logging in with Google
    const createdUser = await User.create({
      avatar: "",
      username: appWriteUser.name,
      email: appWriteUser.email,
      isEmailVerified: true,
      loginType: "GOOGLE",
    });

    await Credit.create({
      point: 10,
      owner: new mongoose.Types.ObjectId(createdUser._id || null),
    });

    const { accesToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(createdUser._id);

    return res
      .status(200)
      .cookie("accesToken", accesToken, cookieOption)
      .cookie("refreshToken", refreshToken, cookieOption)
      .json(
        new ApiResponse(
          200,
          {
            userName: createdUser.username,
            uid: createdUser._id,
            avatar: createdUser.avatar,
            userCredit: 10,
            accesToken,
            refreshToken,
          },
          "User Login Successfully."
        )
      );
  }
});

// logout

const logOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accesToken", cookieOption)
    .clearCookie("refreshToken", cookieOption)
    .json(new ApiResponse(200, {}, "User Logout Successfully."));
});

// refreshTokens

const incomingRefreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken || "";

  if (token.length < 1) {
    return res
      .status(401)
      .json(
        new ApiResponse(
          401,
          {},
          "You dont have RefreshToken, try to login again."
        )
      );
  }

  // decoding token

  const decodedToken = await jwt.verify(
    token,
    process.env.REFRESH_TOKEN_SECRET
  );

  // validating

  if (!decodedToken) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, {}, "Invalid refeshToken, try to login again.")
      );
  }

  const user = await User.findById(decodedToken?.uid || "").select(
    "-password "
  );

  if (!user) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, {}, "Invalid refeshToken , try to login again.")
      );
  }

  if (token !== user.refreshToken) {
    return res
      .status(401)
      .json(
        new ApiResponse(
          401,
          {},
          "RefreshToken expired or using old token, try to login again."
        )
      );
  }

  // get credit points

  const userCredit = await Credit.findOne({
    owner: new mongoose.Types.ObjectId(user._id),
  });

  // generate new tokens

  const { accesToken, refreshToken } = await generateAccessTokenAndRefreshToken(
    user._id
  );

  //send token cookices

  return res
    .status(200)
    .cookie("accesToken", accesToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new ApiResponse(
        200,
        {
          userName: user.username,
          uid: user._id,
          userCredit: userCredit.point || 0,
        },
        "User'd Token Refresher Successfully."
      )
    );
});

// change password

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, {}, "New Password and confirm Password not same.")
      );
  }

  if (oldPassword === newPassword) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, {}, "Old Password can't same as New Password.")
      );
  }

  const user = await User.findById(req.user?._id || "");

  if (!user) {
    return res.status(404).json(new ApiResponse(404, {}, "Cant find user."));
  }

  const isCurrectPassword = await user.isPasswordCurrect(oldPassword);

  if (!isCurrectPassword) {
    return res
      .status(401)
      .json(new ApiResponse(401, {}, "Incurrect old Password."));
  }

  user.password = newPassword;
  user.lastOnline = Date.now();

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userName: user.username,
        uid: user._id,
      },
      "Password changed successfully."
    )
  );
});

// change username

const changeUsername = asyncHandler(async (req, res) => {
  const { newUsername } = req.body;

  if (!newUsername) {
    return res
      .status(401)
      .json(new ApiResponse(401, {}, "New Username not given properly."));
  }
  try {
    const user = await User.findById(req.user._id);

    user.username = newUsername;

    user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { newUsername }, "Username changed"));
  } catch (err) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "Somthing gose wrong while changing username.")
      );
  }
});

// forgot password

const forgotPasswordEmail = asyncHandler(async (req, res) => {
  // take email id

  const { email } = req.body;

  if (!email) {
    return res.status(400).json(new ApiResponse(400, {}, "Email not given."));
  }

  // is that email exist in db

  const user = await User.findOne({
    email: email,
  });

  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "User don't exits with is email id."));
  }

  // genaret a token for forgot password with 15 min exparation time

  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";

  for (let i = 0; i < 25; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // save token in db

  const preForgotPassword = await ForgotPassword.findOne({
    owner: user._id,
  });

  if (preForgotPassword) {
    preForgotPassword.token = token;
    preForgotPassword.expire = new Date(Date.now() + 15 * 60 * 1000);

    await preForgotPassword.save();
  } else {
    await ForgotPassword.create({
      owner: user._id,
      token: token,
      expire: new Date(Date.now() + 15 * 60 * 1000),
    });
  }

  // send a magic link with that token

  await sendForgotPassword(user.email, token, user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email send to your email id."));
});

const forgotPassword = asyncHandler(async (req, res) => {
  // take token, userId, new password

  const { token, uId, newPassword } = req.body;

  // check is user exist

  if (!mongoose.isValidObjectId(uId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "User Id not given properly."));
  }

  const user = await User.findById(uId);

  if (!user) {
    return res.status(404).json(new ApiResponse(404, {}, "User don't exist."));
  }

  // token validation[expair,same]

  const forgotPasswordData = await ForgotPassword.findOne({
    owner: user._id,
  });

  if (!forgotPasswordData) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          {},
          "Try to resending Forgot Password email again."
        )
      );
  }

  if (token !== forgotPasswordData.token) {
    return res
      .status(403)
      .json(new ApiResponse(403, {}, "Token dose not match."));
  }

  if (Date.now() > forgotPasswordData.expire) {
    return res
      .status(403)
      .json(
        new ApiResponse(403, {}, "Token Expies, try after resending email.")
      );
  }

  const isSameAsOldPassword = await user.isPasswordCurrect(newPassword);

  if (isSameAsOldPassword) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, {}, "Old password can't be your new Password.")
      );
  }

  // set new password

  user.password = newPassword;
  user.lastOnline = Date.now();

  await user.save({ validateBeforeSave: false });

  await forgotPasswordData.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changes succesfully."));
});

const currentUserDetails = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "Current user."));
});

// credit used history

const currentUsersCreditHistory = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const uId = req.user._id || null;
    

    const pipeLine = [
      {
        $match: {
          owner: new mongoose.Types.ObjectId(uId),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          historyType: 1,
          pointValue: 1,
          note: 1,
          createdAt:1,
        },
      },
    ];

    const option = { page, limit };

    const creditHistory = await CreditHistory.aggregatePaginate(
      CreditHistory.aggregate(pipeLine),
      option
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          creditHistory,
          "Current users credit Historys fetched successfully."
        )
      );
  } catch (err) {
    res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "Current users credit Historys fetching failed."
        )
      );
  }
});

export {
  registerUser,
  sendEmailtoVerifyAcc,
  verifyEmail,
  loginUser,
  logOut,
  googleAuthLOginRegister,
  incomingRefreshToken,
  changePassword,
  changeUsername,
  forgotPasswordEmail,
  forgotPassword,
  currentUserDetails,
  currentUsersCreditHistory,
};
