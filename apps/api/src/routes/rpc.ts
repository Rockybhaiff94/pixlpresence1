import { Router } from 'express';
import { prisma } from '@discord-rpc/database';
import { io } from '../index'; // Import the socket io instance

export const rpcRouter = Router();

// Middleware to check authentication via Session OR Bearer Token
const requireAuth = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const user = await prisma.user.findUnique({ where: { appToken: token } });
    if (user) {
      req.user = user;
      return next();
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
};

// Get RPC Config
rpcRouter.get('/me', requireAuth, async (req: any, res) => {
  try {
    const rpc = await prisma.richPresence.findUnique({
      where: { userId: req.user.id }
    });
    res.json(rpc || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RPC' });
  }
});

// Update RPC Config
rpcRouter.patch('/me', requireAuth, async (req: any, res) => {
  try {
    const data = req.body;
    const rpc = await prisma.richPresence.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { ...data, userId: req.user.id },
    });
    
    // Emit a Socket.io event here to tell the desktop client to update
    io.to(`user_${req.user.id}`).emit('rpc_update', rpc);
    
    res.json(rpc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update RPC' });
  }
});

// GET /rpc/templates
rpcRouter.get('/templates', requireAuth, async (req: any, res) => {
  try {
    const templates = await prisma.activityTemplate.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { userId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /rpc/templates
rpcRouter.post('/templates', requireAuth, async (req: any, res) => {
  try {
    const { name, category, config } = req.body;
    
    // Check premium limits
    if (!req.user.premiumStatus) {
      const count = await prisma.activityTemplate.count({ where: { userId: req.user.id } });
      if (count >= 1) {
        return res.status(403).json({ error: 'Standard users can only save 1 template. Upgrade to Premium for unlimited.' });
      }
    }

    const template = await prisma.activityTemplate.create({
      data: {
        userId: req.user.id,
        name,
        category: category || 'Custom',
        config: JSON.stringify(config),
        isGlobal: req.user.role === 'ADMIN' ? req.body.isGlobal : false
      }
    });

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// POST /rpc/templates/:id/apply
rpcRouter.post('/templates/:id/apply', requireAuth, async (req: any, res) => {
  try {
    const template = await prisma.activityTemplate.findUnique({
      where: { id: req.params.id }
    });
    
    if (!template || (!template.isGlobal && template.userId !== req.user.id)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const configData = JSON.parse(template.config);

    const updated = await prisma.richPresence.upsert({
      where: { userId: req.user.id },
      update: configData,
      create: { ...configData, userId: req.user.id }
    });

    // Emit a Socket.io event here to tell the desktop client to update
    io.to(`user_${req.user.id}`).emit('rpc_update', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// DELETE /rpc/templates/:id
rpcRouter.delete('/templates/:id', requireAuth, async (req: any, res) => {
  try {
    await prisma.activityTemplate.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});
