import { Request, Response } from "express";
import dbClient from "../utils/db";
import bcrypt from 'bcryptjs'
import { User } from "../utils/types";
import redisClient from "../utils/redis";
import { ObjectId } from "mongodb";
import { userQueue } from "../utils/queues"

class UsersController {
    static async postNew(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body
        if (!email) {
            res.status(400).json({ error: "Missing Email" })
            return
        }
        if (!password) {
            res.status(400).json({ error: "Missing Password" })
            return
        }
        const userExist = await dbClient.userCollection.findOne({ email })
        if (userExist) {
            res.status(400).json({ error: "Already exist" })
            return
        }
        const hashPassword = await bcrypt.hash(password, 10)

        const user: User = { email: email, password: hashPassword }
        try {
            const result = await dbClient.userCollection.insertOne(user);

            if (result.insertedId) {
                await userQueue.add({ userId: result.insertedId })
            }

            res.status(201).json({ "id": result.insertedId, "email": user.email });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    static async getMe(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const user = await dbClient.userCollection.findOne({ _id: new ObjectId(userId)})
            if (!user) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            res.status(200).json({ id: user._id, email: user.email})
            return
        } catch (error) {
            res.status(500).json({ "Error retrieving user": error })
        }
    }
}

export default UsersController