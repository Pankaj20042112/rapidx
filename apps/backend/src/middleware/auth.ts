import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { store } from '../store';

const JWT_SECRET = process.env.JWT_SECRET || 'ridex-super-secret-production-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPPORT_AGENT' | 'SUPER_ADMIN';
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      requestId: req.headers['x-request-id'] || 'req-' + Date.now(),
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid' },
      requestId: req.headers['x-request-id'] || 'req-' + Date.now(),
    });
  }
}

export function authorize(...allowedRoles: Array<'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPPORT_AGENT' | 'SUPER_ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions for this resource' },
      });
    }
    next();
  };
}

export function generateToken(payload: { id: string; phone: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
