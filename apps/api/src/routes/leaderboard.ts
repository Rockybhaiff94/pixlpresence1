import { Router } from 'express';
import { prisma } from '@discord-rpc/database';

export const leaderboardRouter = Router();

/**
 * GET /api/leaderboard
 * Computes genuine leaderboard rankings from real database records.
 * Rules:
 * - Only includes public profiles with genuine registered users.
 * - Categorized by ALL_TIME views, THIS_MONTH views (last 30 days), or MOST_LIKED.
 * - Deterministic tie-breaking on created timestamp.
 * - Returns empty array if no public profiles qualify (never fabricates fake users).
 */
leaderboardRouter.get('/', async (req, res) => {
  try {
    const timeframe = ((req.query.timeframe as string) || 'ALL_TIME').toUpperCase();
    const query = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : '';
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Compute monthly views from real profileView events
    const monthlyViewsAgg = await prisma.profileView.groupBy({
      by: ['profileId'],
      where: {
        viewedAt: { gte: thirtyDaysAgo },
        counted: true,
      },
      _count: {
        id: true,
      },
    });

    const monthlyCountMap = new Map<string, number>();
    monthlyViewsAgg.forEach((agg) => {
      monthlyCountMap.set(agg.profileId, agg._count.id);
    });

    // Query genuine public profiles
    const profiles = await prisma.profile.findMany({
      where: {
        visibility: 'PUBLIC',
        user: {
          username: {
            not: '',
          },
        },
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } },
                { user: { username: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            globalName: true,
            avatar: true,
            role: true,
            badges: true,
            nitroStatus: true,
            premiumStatus: true,
          },
        },
      },
      take: 200,
    });

    // Sort according to requested category
    let sorted = [...profiles];
    if (timeframe === 'THIS_MONTH') {
      sorted.sort((a, b) => {
        const aMonthly = monthlyCountMap.get(a.id) || 0;
        const bMonthly = monthlyCountMap.get(b.id) || 0;
        if (bMonthly !== aMonthly) return bMonthly - aMonthly;
        if (b.views !== a.views) return b.views - a.views;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    } else if (timeframe === 'MOST_LIKED') {
      sorted.sort((a, b) => {
        const aLikes = a.likesCount || 0;
        const bLikes = b.likesCount || 0;
        if (bLikes !== aLikes) return bLikes - aLikes;
        if (b.views !== a.views) return b.views - a.views;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    } else {
      // ALL_TIME (default)
      sorted.sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views;
        const aLikes = a.likesCount || 0;
        const bLikes = b.likesCount || 0;
        if (bLikes !== aLikes) return bLikes - aLikes;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }

    const paginated = sorted.slice(0, limit);

    const creators = paginated.map((p, idx) => {
      const userBadges = typeof p.user.badges === 'string' ? p.user.badges : '[]';
      const isVerified = p.user.role === 'ADMIN' || userBadges.includes('VERIFIED');
      const isPremium = Boolean(p.user.premiumStatus || p.user.nitroStatus);
      const isFounder = p.user.role === 'ADMIN';

      return {
        rank: idx + 1,
        profileId: p.id,
        username: p.user.username,
        displayName: p.displayName || p.user.globalName || p.user.username,
        bio: p.bio || '',
        avatar: p.avatarUrl || p.user.avatar || null,
        viewsAllTime: p.views || 0,
        viewsMonthly: monthlyCountMap.get(p.id) || 0,
        likesCount: p.likesCount || 0,
        verified: isVerified,
        premium: isPremium,
        founder: isFounder,
        activity: p.currentGame || p.customStatus || null,
      };
    });

    res.json({
      success: true,
      timeframe,
      total: creators.length,
      creators,
    });
  } catch (err: any) {
    console.error('[Leaderboard Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve genuine leaderboard data' });
  }
});

