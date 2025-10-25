import prisma from '../config/prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { generateRawToken, hashToken, verifyToken} from "../utils/token.js";
import { addEmailJobToQueue} from "../services/emailQueue.js";

// Auth controller that contains the different authentication methods

// Registering a user logic
export const register = async (req, res) => {

    try {

        // Validate the input received in the request, and notify of any errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        // Deconstructing the request body to get the email and password payload values
        const { email, password, password_confirmation } = req.body;

        // Ensure that the password and password confirmation match
        if (password !== password_confirmation) {
            return res.status(400).json({
                message: 'Passwords do not match',
            })
        }

        // Look if a user with the given email already exists, and notify if it does
        const existingUser = await prisma.user.findUnique( {
            where: {
                email
            }
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'This email is already in use'
            })
        }

        // Create the salt for the password, and create the hashed value
        const passwordSalt = await bcrypt.genSalt( 10);
        const passwordHash = await bcrypt.hash(password, passwordSalt);

        // Create and insert a new user object into the database
        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash,
            },
        });

        // Generate an email verification token, hash it, and set it to expire in one hour
        const rawToken = generateRawToken()
        const tokenHash = await hashToken(rawToken)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

        // Creating a record in the email verification token table
        await prisma.emailVerificationToken.create({
            data: {
                userId: newUser.id,
                tokenHash,
                expiresAt,
            },
        });

        // Add the email request to the queue
        await addEmailJobToQueue(newUser.email, tokenHash, newUser.id)

        // Return the success response
        return res.status(201).json({
            message: 'User successfully registered! Please check your email for a verification email!',
            user: { id: newUser.id, email: newUser.email, isVerified: false },
        })

    } catch (error) {
        return res.status(500).json({
            message: 'Server Error!',
        })
    }
}

// Logging in a user logic
export const login = async (req, res) => {

    try {

        // Validating the request contents
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }

        // Deconstructing the request payload to get the email and password
        const { email, password } = req.body;

        // Looking for an existing user with this email
        const existingUser = await prisma.user.findUnique(
            {where: { email }}
        )

        // If one is not found, indicate such without leaking the existence or absence
        if (!existingUser) {
            return res.status(400).json({
                message: 'Invalid email or password',
            });
        }

        // Checking if the entered password matches the stored hashed password
        const passwordMatch = await bcrypt.compare(password, existingUser.passwordHash);
        if (!passwordMatch) {
            return res.status(400).json({
                message: 'Invalid email or password',
            });
        }

        // Checking if the user has been verified through their email
        if (!existingUser.isVerified) {
            return res.status(400).json({
                message: 'Please verify your email',
            });
        }

        // Generating a JWT token for future authentication requests and signing it to the user
        const token = jwt.sign({
            id: existingUser.id,
            email: existingUser.email,
        }, process.env.APP_SECRET, {
            expiresIn: '1h',
        });

        // Returning the success response
        return res.status(200).json({
            message: 'User successfully logged in',
            token,
            user: { id: existingUser.id, email: existingUser.email }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server Error!',
        });
    }
}