// cron/notificationCron.js
import cron from 'node-cron';
import Notification from '../models/notification.js';

// runs every minute
export const startNotificationCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // find all scheduled notifications whose time has come
      const due = await Notification.find({
        status:      'scheduled',
        scheduledAt: { $lte: now },
      });

      if (due.length === 0) return;

      const ids = due.map((n) => n._id);
      await Notification.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'sent' } },
      );

      console.log(`[cron] Published ${due.length} scheduled notification(s)`);
    } catch (err) {
      console.error('[cron] notification error:', err);
    }
  });

  console.log('[cron] Notification scheduler started');
};