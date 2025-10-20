import prisma from '../config/prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

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

        // Return the success response
        return res.status(201).json({
            message: 'User successfully registered!',
            user: newUser,
        })

    } catch (error) {
        return res.status(500).json({
            message: 'Server Error!',
        })
    }
}