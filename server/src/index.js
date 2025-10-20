import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Backend Running!' });
})

const PORT = process.env.PORT || 8080

// Start up the server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})