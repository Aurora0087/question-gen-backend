import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app =express();

//APP.USe used for middleware and config

app.use(cors({
    origin:process.env.CORE_ORIGIN,
    credentials:true,
}))

app.use(express.json({
    limit: "32kb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "32kb"
}));

app.use(express.static("public"));


app.use(cookieParser());


// routes import


import userRouter from "./routers/users.routers.js";
import chatRouter from "./routers/chats.routers.js";
import paymentRouter from "./routers/payment.routers.js";


//routes

app.get('/', async(_, res) => {
    return res.status(200).json({
        isServerRunning:true,
    })
})

app.use("/api/v1/users", userRouter);

app.use("/api/v1/chats", chatRouter);

app.use("/api/v1/payment", paymentRouter)

export { app };