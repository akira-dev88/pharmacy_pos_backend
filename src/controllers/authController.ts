import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../models/User';
import db from '../database/connection';
import type { AuthRequest } from '../middleware/auth';

export class AuthController {
  // Register new user and create settings
  static register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { shop_name, name, email, password } = req.body;

      // Validate input
      if (!shop_name || !name || !email || !password) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      // Check if user already exists
      const existingUser = UserModel.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = UserModel.create({
        user_uuid: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role: 'owner'
      });

      // Create settings for the shop
      const settingsStmt = db.prepare(`
        INSERT INTO settings (shop_name)
        VALUES (?)
      `);
      settingsStmt.run(shop_name);

      // Get created settings
      const settings = db.prepare('SELECT * FROM settings ORDER BY id DESC LIMIT 1').get();

      // Generate JWT token
      const token = jwt.sign(
        { user_uuid: user.user_uuid, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        user: UserModel.toSafeUser(user),
        shop: settings,
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Login user
  static login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Find user
      const user = UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { user_uuid: user.user_uuid, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Get shop settings
      const settings = db.prepare('SELECT * FROM settings LIMIT 1').get();

      res.json({
        user: UserModel.toSafeUser(user),
        shop: settings,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get current user profile
  static me = (req: AuthRequest, res: Response): void => {
    try {
      const settings = db.prepare('SELECT * FROM settings LIMIT 1').get();
      
      res.json({
        user: req.user,
        shop: settings
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Logout (optional - for token blacklisting if needed)
  static logout = (req: AuthRequest, res: Response): void => {
    // In a simple JWT setup, logout is handled client-side by removing the token
    // For enhanced security, you could implement a token blacklist
    res.json({ message: 'Logged out successfully' });
  };
}
