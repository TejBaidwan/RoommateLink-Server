import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { sendVerificationEmail} from "./mailer.js";
import dotenv from 'dotenv'

dotenv.config()

// Create a connection to the redis service
const connection = new IORedis(
    process.env.REDIS_URL,
)

// Generate an email queue
export const emailQueue = new Queue("emails", { connection })

// Add an email job to the queue
export function addEmailJobToQueue(email, token, userId) {
    return emailQueue.add("sendVerificationEmail", {email, token, userId})
}

// Defining a worker that processes requests in the queue
export const emailWorker = new Worker(
    "emails",
    async (job) => {
        if (job.name === "sendVerificationEmail") {
            const { email, token, userId } = job.data;
            await sendVerificationEmail(email, token, userId);
        }
    },
    { connection, concurrency: 10 }
);