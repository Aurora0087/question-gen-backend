import mongoose from "mongoose";
import { DATABASE_NAME } from "../constants.js";

export const connectDB = async () => {
    try {
        const connectionRes = await mongoose.connect(`${process.env.MONGODB_URL}`,
            {
                dbName: DATABASE_NAME
            }
        )
        console.log(`\n DB is connected... DB HOST : ${connectionRes.connection.host}`);
        
    } catch (error) {
        console.log("ERROR : ", error);
        process.exit(1)
    }
}