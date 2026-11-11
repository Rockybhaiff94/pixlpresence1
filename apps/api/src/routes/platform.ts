import { Router } from 'express';
import { prisma } from '@discord-rpc/database';

export const platformRouter = Router();

/**
 * GET /api/platform/stats
 * Returns genuine aggregated platform statistics directly from the database.
 * Never fabricates numbers.
 */
platformRouter.get('/stats', async (req, res) => {
  try {
    const [profilesCount, viewsAgg, usersCount, likesCount] = await Promise.all([
      prisma.profile.count(),
      prisma.profile.aggregate({
        _sum: {
          views: true,
        },
      }),
      prisma.user.count(),
      prisma.profileLike.count(),
    ]);

    res.json({
      success: true,
      totalProfiles: profilesCount,
      totalViews: viewsAgg._sum.views || 0,
      totalUsers: usersCount,
      totalLikes: likesCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Platform Stats Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve platform stats' });
  }
});

