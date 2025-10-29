import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import {sendPasswordResetEmail, sendVerificationEmail} from "./mailer.js";
import dotenv from 'dotenv'

dotenv.config()

// Create a connection to the redis service
const connection = new IORedis(
    process.env.REDIS_URL,
    {
        maxRetriesPerRequest: null,
        enableReadyCheck: true
    }
)

// Generate an email queue
export const emailQueue = new Queue("emails", { connection })

// Add an email job to the queue
export function addEmailJobToQueue(email, token, userId, emailType) {
    const job = emailQueue.add(emailType, {email, token, userId})
    console.log(`Added job for userId=${userId}, email=${email}`);
    return job;
}

// Defining a worker that processes requests in the queue
export const emailWorker = new Worker(
    "emails",
    async (job) => {
        console.log(`Processing job ${job.id} for userId=${job.data.userId}`);
        if (job.name === "sendVerificationEmail") {
            const { email, token, userId } = job.data;
            await sendVerificationEmail(email, token, userId);
            console.log(`Email sent for userId=${userId}, email=${email}`);
        }
        else if (job.name === "sendPasswordResetEmail") {
            const { email, token, userId } = job.data;
            await sendPasswordResetEmail(email, token);
            console.log(`Email sent for userId=${userId}, email=${email}`);
        }
    },
    { connection, concurrency: 10 }
);