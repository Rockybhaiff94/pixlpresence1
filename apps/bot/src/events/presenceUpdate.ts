import { botEvents } from '../index';

export default {
  name: 'presenceUpdate',
  once: false,
  async execute(oldPresence: any, newPresence: any) {
    try {
      botEvents.emit('presenceUpdate', oldPresence, newPresence);
    } catch (err) {
      console.error('[PixelBot PresenceUpdate Dispatch Error]:', err);
    }
  },
};
