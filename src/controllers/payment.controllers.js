import mongoose from "mongoose";
import { PaymentOrder } from "../models/paymentOrder.model.js";

import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import Razorpay from "razorpay";

import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";
import { Credit } from "../models/credit.models.js";
import { CreditHistory } from "../models/creditHistory.models.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY_ID,
  key_secret: process.env.RAZORPAY_API_SECRET_KEY,
});

// create a Order for payment

const ORDER_PACKAGES_LIST = [
  {
    totalToken: 1,
    perTokenPrice: 15,
  },
  {
    totalToken: 10,
    perTokenPrice: 12,
  },
  {
    totalToken: 20,
    perTokenPrice: 10,
  },
];

const createPaymentOrder = asyncHandler(async (req, res) => {
  const {
    orderedPackage,
    orderedPackageAmount = 1,
    currency = "INR",
  } = req.body;

  const userId = req.user._id || null;

  if (
    orderedPackage === NaN ||
    orderedPackage === null ||
    orderedPackage === undefined
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Package type not selected."));
  }

  if (!orderedPackageAmount) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Package Amount not selected."));
  }

  if (
    Number(orderedPackage) < 0 ||
    Number(orderedPackage) > ORDER_PACKAGES_LIST.length - 1
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Package type not selected Properly."));
  }

  if (Number(orderedPackageAmount) < 1) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          {},
          `Minimum package Amount 1 but given ${orderedPackageAmount}.`
        )
      );
  }

  try {
    const requestedToken =
      ORDER_PACKAGES_LIST[Number(orderedPackage)].totalToken *
      Number(orderedPackageAmount);

    const amount =
      ORDER_PACKAGES_LIST[Number(orderedPackage)].perTokenPrice *
      requestedToken;

    const razerpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: String(currency).toUpperCase(),
      receipt: "receipt111",
    });

    const newOrder = await PaymentOrder.create({
      paymentGatwayOrderId: razerpayOrder.id,
      entity: razerpayOrder.entity,
      amount: razerpayOrder.amount,
      amount_paid: razerpayOrder.amount_paid,
      amount_due: razerpayOrder.amount_due,
      tokensBuying: requestedToken,
      currency: razerpayOrder.currency,
      status: razerpayOrder.status,
      paymentGatwayOrderCreated_at: razerpayOrder.created_at,
      receipt: razerpayOrder.receipt,
      owner: new mongoose.Types.ObjectId(userId),
    });

    if (!newOrder) {
      return res
        .status(500)
        .json(
          new ApiResponse(500, {}, "Unable to add order data in database.")
        );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { newOrder }, "Order Created Succesfully."));
  } catch (err) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "Somthing want wrong while Creating new Order for Payment."
        )
      );
  }
});

const confirmPaymentWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (
    !validateWebhookSignature(
      JSON.stringify(req.body),
      req.headers["x-razorpay-signature"],
      secret
    )
  ) {
    res
      .status(403)
      .json(new ApiResponse(403, {}, "signature varification failed."));
  }

  const razerpayOrder = await PaymentOrder.findOne({
    paymentGatwayOrderId: req.body.payload.payment.entity.order_id,
  });

  if (razerpayOrder) {
    const requestedToken = Number(razerpayOrder.tokensBuying);

    const orderedUserId = razerpayOrder.owner;

    const orderedUserCredit = await Credit.findOne({
      owner: new mongoose.Types.ObjectId(orderedUserId),
    });

    if (!orderedUserCredit) {
      await Credit.create({
        owner: new mongoose.Types.ObjectId(orderedUserId),
        point: 10 + requestedToken,
      });
    }

    orderedUserCredit.point += requestedToken;

    await orderedUserCredit.save();

    razerpayOrder.isPaid = true;

    razerpayOrder.razorpayPaymentSuccess = {
      paymentId: String(req.body.payload.payment.entity.id),
      method: String(req.body.payload.payment.entity.method),
    };
    razerpayOrder.amount_due = 0;
    razerpayOrder.amount_paid = Number(req.body.payload.payment.entity.amount);
    razerpayOrder.status = String(req.body.payload.payment.entity.status);

    await razerpayOrder.save();

    await CreditHistory.create({
      owner: new mongoose.Types.ObjectId(orderedUserId),
      historyType: "INCREASE",
      pointValue: Number(requestedToken),
      note: `${requestedToken} token purchased.`,
    });
  }

  return res.status(200).json(new ApiResponse(200, {}, "."));
});

const currentUsersBillings = asyncHandler(async (req, res) => {
  try {
    const uId = req.user._id || null;

    const billings = await PaymentOrder.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(uId),
          isPaid: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          isPaid: 1,
          paymentGatway: 1,
          paymentGatwayOrderId: 1,
          tokensBuying: 1,
          amount: 1,
          currency: 1,
          razorpayPaymentSuccess: 1,
          createdAt: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, billings, "current User billings."));
  } catch (err) {
    console.log(err);

    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "Something gose wrong while geting billings for current User."
        )
      );
  }
});

export { createPaymentOrder, confirmPaymentWebhook, currentUsersBillings };
