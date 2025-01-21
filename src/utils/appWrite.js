import { Client, Users } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const users = new Users(client);


export async function getUser(userId) {
    try {
        const user = await users.get(userId);
        console.log(user);
        return user;
    } catch (error) {
        console.error(error.message);
        return null;
    }
}