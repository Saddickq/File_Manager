import { Request, Response } from "express";
import dbClient from "../utils/db";
import bcrypt from 'bcryptjs'
import { User } from "../utils/types";

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

        const user: User = {email: email, password: hashPassword}
        try {
            const result = await dbClient.userCollection.insertOne(user);
            res.status(201).json({ "id": result.insertedId, "email": user.email });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}

export default UsersController