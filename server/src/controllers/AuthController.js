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

        // Create a record of the password in the password history table for versioned credentials
        await prisma.passwordHistory.create({
            data: {
                userId: newUser.id,
                oldHash: passwordHash,
            }
        })

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
        await addEmailJobToQueue(newUser.email, rawToken, newUser.id, "sendVerificationEmail")

        // Return the success response
        return res.status(201).json({
            message: 'User successfully registered! Please check your email for a verification email!',
            user: { id: newUser.id, email: newUser.email, isVerified: false },
        })

    } catch (error) {
        return res.status(500).json({
            message: 'Server Error!',
            error: error,
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
            error: error,
        });
    }
}

// Verifying a users email upon registration logic
export const verifyEmail = async (req, res) => {
    try {

        // Deconstructing the request payload and getting the token and userid
        const {token, id} = req.query;
        if (!token || !id){
            return res.status(400).json({message: "Invalid verification link"});
        }

        // Finding the verification token for the logging-in user
        const userId = id
        const record = await prisma.emailVerificationToken.findFirst({
            where: { userId, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
        });

        // Notifying if there is no valid token found
        if (!record) {
            return res.status(400).json({message: "Token not found or expired"});
        }

        // Verifying the token with the hashed token
        const validToken = await verifyToken(token, record.tokenHash);
        if (!validToken) {
            return res.status(400).json({message: "Invalid token"});
        }

        // Updating the isVerified field for the logging-in user to true
        await prisma.user.update({
            where: { id: userId },
            data: { isVerified: true }
        });

        // Deleting the tokens associated with this user, as email verification is one-time
        await prisma.emailVerificationToken.deleteMany({ where: { userId } });

        return res.json({ message: "Email verified successfully" });
    } catch (err) {
        console.error("Verify email error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Resend verification email logic
export const resendVerification = async (req, res) => {
    try {

        // Deconstructing the request payload to get the email, and finding the associated user
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(200).json({message: "If the email exists, a link was sent."});
        }

        // If the user is already verified, indicate so
        if (user.isVerified) {
            return res.status(200).json({message: "Account already verified."});
        }

        // Generating a new verification token
        const rawToken = generateRawToken();
        const tokenHash = await hashToken(raw);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

        // Deleting the tokens associated with this user, as email verification is one-time
        await prisma.emailVerificationToken.create({
            data: { userId: user.id, tokenHash, expiresAt }
        });

        // Add the email request to the queue
        await addEmailJobToQueue(email, rawToken, user.id, "sendVerificationEmail");

        return res.json({ message: "Verification email sent" });
    } catch (err) {
        console.error("Resend verification error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Requesting a password reset email endpoint logic
export const requestPasswordReset = async (req, res) => {

    try {
        // Validating the data received
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        // Deconstruct the request payload, and finding the user with the given email (if applicable)
        const {email} = req.body;
        const user = await prisma.user.findUnique({where: {email}});
        if (!user) {
            return res.json({
                message: 'If an account exists, a link was sent.',
            });
        }

        // Generate a password reset token, hashing it, and setting it to expire in 30 minutes
        const rawToken = generateRawToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Create a PasswordResetToken and store it in the db
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt
            }
        })

        // Add the password reset email request to the background queue
        await addEmailJobToQueue(user.email, rawToken, user.id, "sendPasswordResetEmail");

        return res.json(
            {message: "If an account exists, a reset link has been sent."}
        );
    } catch (err) {
        return res.status(500).json({
            message: 'Server error!',
            error: err
        });
    }
}

// Resetting a user's password endpoint logic
export const resetPassword = async (req, res) => {

    try {

        // Validating the data received
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            })
        }

        // Deconstructing the request payload and ensuring a valid token and password exist
        const { token, id, password } = req.body;
        if (!token || !id || !password) {
            return res.status(400).json({
                message: "Invalid verification link"
            })
        }

        //Finding the password reset token that's valid and assigned to this user
        const record = await prisma.passwordResetToken.findFirst({
            where: {
                id, expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: "desc" },
        });

        // Indicating if an expired, non-existent, or invalid token is presented
        if (!record) {
            return res.status(400).json({
                message: "Token not found or expired"
            })
        }

        // Verifying the token with the stored hashed token
        const validToken = await verifyToken(token, record.tokenHash);
        if (!validToken) {
            return res.status(400).json({
                message: "Invalid token"
            })
        }

        // Fetch user and their password history
        const user = await prisma.user.findUnique(
            { where: { id },
                include: { passwordHistory: {orderBy: { createdAt: "desc" } }, },
            }
            );
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        const history = user.passwordHistory.slice(0, 5);
        for (const oldPassword of history) {
            const recycled = await bcrypt.compare(password, oldPassword.oldHash);
            if (recycled) {
                return res.status(400).json({
                    message: "Ensure you are not using any previous password"
                })
            }
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(password, 10);

        // I'm using transactions to do multiple database operations at once, to keep it atomic
        await prisma.$transaction(async (tx) => {

            // Update the users password with the new one
            await tx.user.update({
                where: {
                    id
                },
                data: {
                    passwordHash
                },
                }
            );

            // Add this password to the password history table
            await tx.passwordHistory.create({
                data: {
                    userId: id,
                    oldHash: passwordHash,
                },
            });

            // Get their previous passwords in descending order by data created
            const previousHistory = await tx.passwordHistory.findMany({
                where: {
                    userId: id,
                },
                orderBy: { createdAt: "desc" },
            });

            // If there is more than 5 passwords, delete the oldest one
            if (previousHistory.length > 5) {
                const oldestPassword = previousHistory.slice(5)
                await tx.passwordHistory.deleteMany({
                    where: {
                        id: { in: oldestPassword.map((old) => old.id) },
                    }
                });
            }

            // Delete the password reset tokens as they are on-time use
            await tx.passwordResetToken.deleteMany({
                where: {
                    id
                },
            });
        });

        return res.json({
            message: "Password reset successfully."
        })
    } catch (err) {
        return res.status(500).json({
            message: "Server error!",
            error: err,
        })
    }
}