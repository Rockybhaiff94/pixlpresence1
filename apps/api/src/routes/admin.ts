import { Router } from 'express';
import { prisma } from '@discord-rpc/database';

export const adminRouter = Router();

// Middleware to check if user is an ADMIN
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

adminRouter.use(requireAdmin);

// Get Platform Stats
adminRouter.get('/stats', async (req: any, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalProfiles = await prisma.profile.count();
    const totalRpcConfigs = await prisma.richPresence.count();

    res.json({ totalUsers, totalProfiles, totalRpcConfigs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get Paginated Users
adminRouter.get('/users', async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        discordId: true,
        username: true,
        email: true,
        role: true,
        badges: true,
        nitroStatus: true,
        premiumStatus: true,
        createdAt: true,
      }
    });

    const total = await prisma.user.count();

    res.json({ users, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update User
adminRouter.patch('/users/:id', async (req: any, res) => {
  try {
    const { badges, nitroStatus, premiumStatus, role } = req.body;
    const userId = req.params.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        badges: badges !== undefined ? badges : undefined,
        nitroStatus: nitroStatus !== undefined ? nitroStatus : undefined,
        premiumStatus: premiumStatus !== undefined ? premiumStatus : undefined,
        role: role !== undefined ? role : undefined,
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: `Updated user ${userId}`,
        targetId: userId,
        adminId: req.user.id
      }
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});
