import { createClient } from 'redis'

type RedisClientType = ReturnType<typeof createClient>;

class RedisClient {
    client: RedisClientType;
    connected: boolean;

    constructor() {
        this.client = createClient()

        this.client.on('error', (error) => {
            this.connected = false
            console.log("Redis Client Error:", error)
        })
        
        this.client.connect()
        console.log("Redis server connected succesfully")

        this.connected = true
        
    }

    isAlive(): boolean {
        return this.connected
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key)

    }

    async set(key: string, value: any, exTime: number): Promise<void> {
        try {
            await this.client.set(key, value, { EX: exTime })
        } catch (error) {
            console.error(`Error setting key "${key}" in Redis:`, error)
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key)
    }
}

const redisClient = new RedisClient()
export default redisClient