import { Request, Response } from "express";
import redisClient from "../utils/redis";
import dbClient from "../utils/db";
import { ObjectId } from "mongodb";
import fs from 'fs/promises'
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { FOLDER_PATH } from "../config";
import { File } from "../utils/types";

class FilesController {
    static async postUpload(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const { name, type, parentId = 0, isPublic = false, data } = req.body
            if (!name) {
                res.status(400).json({ error: "Missing File name" })
                return
            }
            if (!type || !(['folder', 'file', 'image'].includes(type))) {
                res.status(400).json({ error: "Missing or Invalid file type" })
                return
            }
            if (!data && type !== 'folder') {
                res.status(400).json({ error: "Missing File data" })
                return
            }
            if (parentId !== 0) {
                const parentFile = await dbClient.fileCollection.findOne({ _id: new ObjectId(parentId) })
                if (!parentFile) {
                    res.status(400).json({ error: "Parent not found" })
                    return
                }
                if (parentFile.type !== 'folder') {
                    res.status(400).json({ error: "Parent is not a folder" })
                    return
                }
            }
            if (type === 'folder') {
                const folder: File = { userId, name, type, parentId, isPublic }
                const result = await dbClient.fileCollection.insertOne(folder)
                res.status(201).json({ _id: result.insertedId, ...folder })
                return
            }
            const filename = uuidv4()
            const filePath = path.join(FOLDER_PATH, filename)
            try {
                await fs.mkdir(FOLDER_PATH, { recursive: true })
                const fileData = Buffer.from(data, 'base64')
                await fs.writeFile(filePath, fileData)

                const file: File = { userId, name, isPublic, type, parentId, localPath: filePath }
                const result = await dbClient.fileCollection.insertOne(file)
                res.status(201).json({ _id: result.insertedId, ...file })
                return
            } catch (error) {
                res.status(500).json({ error: error });
            }
        } catch (error) {
            res.status(500).json({ error: error });
        }
    }

    static async getShow(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const userFiles = await dbClient.fileCollection.find({ userId: new ObjectId(userId) })
            if (!userFiles || userId === id) {
                res.status(404).json({ error: "Not found" });
                return
            }
            res.status(200).json(userFiles)
        } catch (error) {
            res.status(500).json({ error: error });
        }
    }

    static async getIndex(req: Request, res: Response): Promise<void> {
        try {
            const { parentId, page = 0 } = req.query
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const pageSize = 20
            const files = await dbClient.fileCollection.aggregate([{
                $match: {
                    parentId: parentId
                },
                $facet: {
                    metadata: [{ $count: 'totalCount' }],
                    data: [{ $skip: Number(page) * pageSize }, { $limit: pageSize }]
                }
            }])
            // console.log('files', files)
            res.status(200).json(files)
        } catch (error) {
            res.status(500).json({ error: error })
        }
    }
}

export default FilesController