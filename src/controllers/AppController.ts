import { Request, Response } from "express";
import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class AppController {
    static getStatus(req: Request, res: Response): void {
        const redisAlive = redisClient.isAlive()
        const dbisAlive = dbClient.isAlive()

        res.status(200).json({ 'redis': redisAlive, 'db': dbisAlive })
    }

    static async getStats(req: Request, res: Response): Promise<void> {
        const nbUsers = await dbClient.nbUsers()
        const nbFiles = await dbClient.nbFiles()

        res.status(200).json({ "users": nbUsers, "files": nbFiles })
    }
}

export default AppController