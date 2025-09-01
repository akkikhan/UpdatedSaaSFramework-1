import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

declare global {
  namespace Express {
    interface Request {
      platformAdmin?: {
        adminId: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export const platformAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Platform admin authorization required",
      error: "PLATFORM_ADMIN_AUTH_REQUIRED",
    });
  }

  try {
    const token = authHeader.substring(7);

    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if this is a platform admin token
    if (payload.type !== "platform_admin") {
      return res.status(403).json({
        message: "Platform admin access required",
        error: "PLATFORM_ADMIN_ACCESS_REQUIRED",
      });
    }

    // Verify platform admin still exists and is active
    const platformAdmin = await storage.getPlatformAdmin(payload.adminId);

    if (!platformAdmin || !platformAdmin.isActive) {
      return res.status(403).json({
        message: "Platform admin account inactive or not found",
        error: "PLATFORM_ADMIN_INACTIVE",
      });
    }

    // Attach platform admin info to request
    req.platformAdmin = {
      adminId: platformAdmin.id,
      email: platformAdmin.email,
      name: platformAdmin.name,
      role: platformAdmin.role,
    };

    next();
  } catch (error) {
    console.error("Platform admin authentication error:", error);
    return res.status(401).json({
      message: "Invalid platform admin token",
      error: "INVALID_PLATFORM_ADMIN_TOKEN",
    });
  }
};

// Optional middleware for super admin only actions
export const superAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.platformAdmin || req.platformAdmin.role !== "super_admin") {
    return res.status(403).json({
      message: "Super admin access required",
      error: "SUPER_ADMIN_ACCESS_REQUIRED",
    });
  }

  next();
};
