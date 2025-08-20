import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        email: string;
        permissions: string[];
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  const payload = await authService.verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID required' });
  }

  // Validate tenant ID matches authenticated user's tenant
  if (req.user && req.user.tenantId !== tenantId) {
    return res.status(403).json({ message: 'Access denied to tenant' });
  }

  next();
};
