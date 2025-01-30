import dotenv from "dotenv";

// to access all env veriables
dotenv.config({
    path: "../env"
});

import { connectDB } from "./db/index.js";
import { app } from "./app.js";

const serverPort = process.env.PORT || 8002;

connectDB()
    .then(() => {
        app.on('error', (err) => {
            console.log('Server Error : ', err);
            throw err;
        })
        
        const server = app.listen(serverPort, () => {
            console.log(`Server is running on Port : ${serverPort}`);
        });

        server.timeout = 0;
    })
    .catch((err) => {
        console.log("MpngoDb connection fails... ", err);
    })