import { Client, Users } from "node-appwrite";

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
    .setProject(process.env.APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

const users = new Users(client);

export async function getUser(userId) {
    
    try {
        const user = await users.get(userId);
        return user;
    } catch (error) {
        console.error(error.message);
        return null;
    }
}
