import { Collection, MongoClient } from "mongodb";
import { DB_DATABASE, DB_HOST, DB_PORT } from "../config";

class DBClient {
    connected: boolean
    userCollection: Collection
    fileCollection: Collection

    constructor() {
        this.connected = false;
        this.userCollection = {} as Collection;
        this.fileCollection = {} as Collection;

        MongoClient.connect(`mongodb://${DB_HOST}:${DB_PORT}`)
            .then((client) => {
                this.connected = true;
                this.userCollection = client.db(DB_DATABASE).collection('users');
                this.fileCollection = client.db(DB_DATABASE).collection('files');
                console.log("Connected to database server successfully")
            })
            .catch((error) => {
                this.connected = false;
                console.log("Connected to database server failed:", error);
            });
    }

    isAlive(): boolean {
        return this.connected
    }

    async nbUsers(): Promise<number> {
        const numberOfUsers = await this.userCollection.countDocuments()
        return numberOfUsers
    }

    async nbFiles(): Promise<number> {
        const numberOfFiles = await this.fileCollection.countDocuments()
        return numberOfFiles
    }
}

const dbClient = new DBClient()
export default dbClient