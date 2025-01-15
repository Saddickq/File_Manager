import { MongoClient } from "mongodb";
import { DB_DATABASE, DB_HOST, DB_PORT } from "../config";

class DBClient {
    client: MongoClient
    connected: boolean

    constructor() {
        this.connected = false;

        this.client = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`)

        this.initialised()
    }

    async initialised() {
        try {
            await this.client.connect()
            this.connected = true
            console.log("Database server connected succesfully")
        } catch (error) {
            this.connected = false
            console.log("Database server connection Failed:", error)
        }
    }

    isAlive(): boolean {
        return this.connected
    }

    async nbUsers(): Promise<number> {
        const userCollection = this.client.db(DB_DATABASE).collection('users')
        const numberOfUsers = await userCollection.countDocuments()
        return numberOfUsers
    }

    async nbFiles(): Promise<number> {
        const fileCollection = this.client.db(DB_DATABASE).collection('files')
        const numberOfFiles = await fileCollection.countDocuments()
        return numberOfFiles
    }
}

const dbClient = new DBClient()
export default dbClient