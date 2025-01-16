import express from 'express'
import { PORT } from './config';
import AppRouter from "./routes"

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true}))

app.use(AppRouter)

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`)
})