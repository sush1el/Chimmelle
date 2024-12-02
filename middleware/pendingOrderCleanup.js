const cron = require('node-cron');
const Order = require('../models/Order'); // Adjust the path based on your directory structure

/**
 * Scheduled task to delete 'pending' orders every minute
 */
const schedulePendingOrderCleanup = () => {
  // Schedule the job to run every minute
  cron.schedule('0 0 * * 0', async () => {
    try {
      const result = await Order.deleteMany({ status: 'pending' });
      console.log(`[${new Date().toISOString()}] Deleted ${result.deletedCount} pending orders.`);
    } catch (error) {
      console.error('Error during scheduled cleanup of pending orders:', error.message);
    }
  });
};

module.exports = schedulePendingOrderCleanup;
