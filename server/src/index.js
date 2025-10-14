import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from "./config/prismaClient.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Backend Running!' });
})

// Test route to check prisma client is up and running with database
app.get("/api/users", async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});


const PORT = process.env.PORT || 8080

// Start up the server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})