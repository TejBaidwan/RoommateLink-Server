import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Backend Running!' });
})

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})