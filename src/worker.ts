import imageThumbnail from "image-thumbnail"
import { userQueue, fileQueue } from "./utils/queues"
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

        console.log("Thumbnails generated")
    }
    catch (error) {
        throw error
    }
})

userQueue.process(async (job) => {
    const { userId } = job.data
    try {
        if (!userId) throw new Error('Missing userId')

        const user = await dbClient.userCollection.findOne({ _id: new ObjectId(userId) })
        if (!user) throw new Error('User not found')

        console.log(`Welcome ${user.email}`)
    }
    catch (error) {
        throw error
    }
})