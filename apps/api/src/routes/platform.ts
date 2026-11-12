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

/**
 * POST /api/platform/fulfill-order
 * Internal webhook fulfillment endpoint secured with SESSION_SECRET.
 * Upgrades user to Premium or grants custom badge upon validated Paddle transaction.
 */
platformRouter.post('/fulfill-order', async (req, res) => {
  const authHeader = req.headers['x-internal-secret'];
  const sessionSecret = process.env.SESSION_SECRET || 'pixelgg-session-secret-production-random-key-2026-auth';
  if (!authHeader || authHeader !== sessionSecret) {
    return res.status(401).json({ error: 'Unauthorized internal call' });
  }

  const { userId, userEmail, itemType, paddleTransactionId, paddleCustomerId } = req.body;
  try {
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && userEmail) {
      user = await prisma.user.findUnique({ where: { email: userEmail } });
    }

    if (!user) {
      console.warn(`[Paddle Fulfill] User not found for userId=${userId}, email=${userEmail}`);
      return res.status(404).json({ error: 'User not found for fulfillment' });
    }

    const updates: any = {};
    if (itemType === 'PREMIUM') {
      updates.premiumStatus = true;
    } else if (itemType === 'CUSTOM_BADGE') {
      let currentBadges: string[] = [];
      try {
        currentBadges = JSON.parse(user.badges || '[]');
      } catch (_) {}
      if (!currentBadges.includes('verified')) {
        currentBadges.push('verified');
      }
      updates.badges = JSON.stringify(currentBadges);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    console.log(`[Paddle Fulfill Success] User ${user.id} updated with ${itemType} (Txn: ${paddleTransactionId || 'N/A'})`);
    return res.json({ success: true, userId: user.id, updates });
  } catch (err: any) {
    console.error('[Paddle Fulfill Error]:', err);
    return res.status(500).json({ error: 'Fulfillment failed' });
  }
});

