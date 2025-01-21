import { Router } from "express";

import { verifyUsersEmailVerifyed } from "../middlewares/auth.middleware.js";


import { confirmPaymentWebhook, createPaymentOrder, currentUsersBillings } from "../controllers/payment.controllers.js";


const paymentRouter = Router();

paymentRouter.route("/razorpay/webhook").post(confirmPaymentWebhook);



//

paymentRouter.route("/razorpay/makeorder").post(verifyUsersEmailVerifyed,createPaymentOrder);

paymentRouter.route("/current/billings").get(verifyUsersEmailVerifyed,currentUsersBillings);

export default paymentRouter;