import { Request, Response } from "express";
import dbClient from "../utils/db";
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from "uuid"
import redisClient from "../utils/redis";


class AuthController {
    static async getConnect(req: Request, res: Response): Promise<void> {
        const authHeader = req.headers.authorization
        if (!authHeader) {
            res.status(401).json({ error: "Unauthorised" })
            return
        }
        const base64Credentials = authHeader.split(" ")[1]
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
        const [email, password] = credentials.split(":")

        if (!email || !password) {
            res.status(401).json({ error: "Unauthorised" })
            return
        }
        const user = await dbClient.userCollection.findOne({ email })
        if (!user) {
            res.status(401).json({ error: "Unauthorised" })
            return
        }
        if (!bcrypt.compareSync(password, user.password)) {
            res.status(401).json({ error: "Unauthorised" })
            return
        }
        const token = uuidv4()
        const key = `auth_${token}`
        await redisClient.set(key, user._id.toString(), (3600 * 24))
        res.status(200).json({ "token": token })
    }

    static async getDisconnect(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)

            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            await redisClient.del(key)
            res.status(204)
            return
        } catch (error) {
            res.status(500).json({ "Error retrieving user": error })
        }

    }
}

export default AuthController