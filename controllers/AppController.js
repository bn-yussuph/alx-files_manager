/*
 *
 *
 *
 */
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class AppController {
  static async getStatus(req, res) {
    const db = dbClient.isAlive();
    const redis = redisClient.isAlive();
    const state = { redis, db };
    return res.status(200).json(state);
  }

  static async getStats(req, res) {
    const userCount = await dbClient.nbUsers();
    const fileCount = await dbClient.nbFiles();
    const stats = { users: userCount, files: fileCount };
    return res.status(200).json(stats);
  }
}

export default AppController;
