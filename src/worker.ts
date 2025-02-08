import imageThumbnail from "image-thumbnail"
import fileQueue from "./utils/fileQueue"
import dbClient from "./utils/db"
import { writeFile } from "fs/promises"
import { ObjectId } from "mongodb"


fileQueue.process(async (job) => {
    const { userId, fileId } = job.data

    try {
        if (!userId) throw new Error('Missing userId')
        if (!fileId) throw new Error('Missing fileId')

        const file = await dbClient.fileCollection.findOne({ _id: new ObjectId(fileId), userId })
        if (!file) throw new Error('File not found')

        const thumbnail500 = await imageThumbnail(file.localPath, { width: 500, responseType: 'buffer' })
        const thumbnail250 = await imageThumbnail(file.localPath, { width: 250, responseType: 'buffer' })
        const thumbnail100 = await imageThumbnail(file.localPath, { width: 100, responseType: 'buffer' })

        await writeFile(`${file.localPath}_500`, thumbnail500)
        await writeFile(`${file.localPath}_250`, thumbnail250)
        await writeFile(`${file.localPath}_100`, thumbnail100)

    }
    catch (error) {
        throw error
    }
})