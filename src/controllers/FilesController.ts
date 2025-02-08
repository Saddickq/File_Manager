import { Request, Response } from "express";
import redisClient from "../utils/redis";
import dbClient from "../utils/db";
import { ObjectId } from "mongodb";
import fs from 'fs/promises'
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { FOLDER_PATH } from "../config";
import { File } from "../utils/types";
import mime from "mime-types"

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
            const file = await dbClient.fileCollection.findOne({ _id: new ObjectId(id), userId: userId })

            if (!file) {
                res.status(404).json({ error: "Not found" });
                return
            }
            res.status(200).json(file)
        } catch (error) {
            res.status(500).json({ error: error });
        }
    }

    static async getIndex(req: Request, res: Response): Promise<void> {
        try {
            const { parentId = 0, page = 0 } = req.query
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const pageSize = 20
            // const parsedParentId = parentId === "0" ? 0 : parentId;

            const files = await dbClient.fileCollection.aggregate([
                {
                    $match: {
                        userId: userId,
                        // parentId: parentId
                    }
                },
                {
                    $facet: {
                        metadata: [{ $count: 'totalCount' }],
                        data: [
                            { $skip: Number(page) * pageSize },
                            { $limit: pageSize }
                        ]
                    }
                }
            ]).toArray()

            res.status(200).json(files[0].data)
        } catch (error) {
            res.status(500).json({ error: error })
        }
    }

    static async putPublish(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const file = await dbClient.fileCollection.updateOne(
                { _id: new ObjectId(id), userId: userId },
                { $set: { isPublic: true } }
                )
            if (!file) {
                res.status(404).json({ error: "Not found" });
                return
            }
            res.status(200).json(file)
        } catch (error) {
            res.status(500).json({ error: error });
        }
    }

    static async putUnpublish(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            if (!userId) {
                res.status(401).json({ error: "Unauthorised" })
                return
            }
            const file = await dbClient.fileCollection.updateOne(
                { _id: new ObjectId(id), userId: userId },
                { $set: { isPublic: false } }
                )
            if (!file) {
                res.status(404).json({ error: "Not found" });
                return
            }
            res.status(200).json(file)
        } catch (error) {
            res.status(500).json({ error: error });
        }
    }

    static async getFile(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const token = req.headers["x-token"]
            const key = `auth_${token}`
            const userId = await redisClient.get(key)
            // if (!userId) {
            //     res.status(401).json({ error: "Unauthorised" })
            //     return
            // }
            const file = await dbClient.fileCollection.findOne({ _id: new ObjectId(id) })
            if (!file) {
                res.status(404).json({error: "Not found"})
                return
            }
            if (file.type === 'folder') {
                res.status(400).json({error: "A folder doesn't have content"})
                return
            }
            if (!file.isPublic && file.userId !== userId) {
                res.status(404).json({error: "Not a public file or doesn't delong to you"})
                return
            }

            fs.access(file.localPath)
                .then(async () => {
                    const mimeType = mime.lookup(file.name) || "application/octet-stream"
                    res.setHeader("Content-Type", mimeType)
                    const fileBuffer = await fs.readFile(file.localPath)
                    res.status(200).send(fileBuffer)
                })
                .catch(() => {
                    res.status(404).json({error: "File not in local Storage"})
                })
        } catch (error) {
            res.status(500).json({error: error})
        }
    }
}

export default FilesController