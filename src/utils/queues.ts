import Bull from 'bull'

const fileQueue = new Bull('image-processing', {
	redis: { host: "127.0.0.1", port: 6379 }
})

const userQueue = new Bull('welcome-email', {
	redis: { host: "127.0.0.1", port: 6379 }
})

export { fileQueue, userQueue } 