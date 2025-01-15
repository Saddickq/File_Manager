import dotenv from 'dotenv'

dotenv.config()

const PORT = parseInt(process.env.PORT || '5000', 10)
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT || '27017', 10)
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager'

export {
    PORT,
    DB_HOST,
    DB_PORT,
    DB_DATABASE
}