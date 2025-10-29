import express from 'express';
import { body } from 'express-validator'
import {
    register,
    login,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword, verifyResetOTP
} from '../controllers/AuthController.js';

// Express router paths for auth routes
const router = express.Router();

// Register auth route with validation
router.post('/register',
    [
        body('email').isEmail().withMessage('Valid email address required'),
        body('password').isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long.')
            .matches(/[a-z]/)
            .withMessage('Password must contain a lowercase letter.')
            .matches(/[A-Z]/)
            .withMessage('Password must contain an uppercase letter.')
            .matches(/\d/)
            .withMessage('Password must contain a number.')
            .matches(/[\W_]/)
            .withMessage('Password must contain a special character.'),
    ], register);

// Login auth route with validation
router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Valid email required"),
        body("password").notEmpty().withMessage("Valid password required"),
    ],
    login
)

// Verify email and resend email routes
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

// Request password reset and reset password routes
router.post("/request-reset",
    [
        body("email").isEmail().withMessage("Valid email required"),
    ],
    requestPasswordReset);

// Verify OTP reset endpoint
router.post('/verify-reset-otp',
    [
        body("email").isEmail().withMessage("Valid email required"),
        body("otp").notEmpty().withMessage("Valid OTP number required"),
    ],
    verifyResetOTP
    )

router.post("/reset-password",
    [
        body("token").notEmpty(),
        body("id").notEmpty(),
        body('password').isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long.')
            .matches(/[a-z]/)
            .withMessage('Password must contain a lowercase letter.')
            .matches(/[A-Z]/)
            .withMessage('Password must contain an uppercase letter.')
            .matches(/\d/)
            .withMessage('Password must contain a number.')
            .matches(/[\W_]/)
            .withMessage('Password must contain a special character.'),
    ],
    resetPassword
)

export default router;
