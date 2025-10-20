import express from 'express';
import { body } from 'express-validator'
import {
    register
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

export default router;
