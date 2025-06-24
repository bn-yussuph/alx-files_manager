/*
 *
 *
 *
 */
import sha1 from 'sha1';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';
import mongo from 'mongodb';
const { ObjectId } = mongo;

class UsersController {
  static async postNew(req, res) {
    const queue = new Queue('userQueue');
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
    }
    try {
      const hashpwd = sha1(password);
      const col = dbClient.db.collection('users');
      const user = await col.findOne({ email });
      if (user) {
        res.status(400).json({ error: 'Already exist' });
      } else {
        col.insertOne({ email, password: hashpwd });
        const newUser = await col.findOne({ email }, { projection: { email: 1 } });
        queue.add({ userId: insertedId });
        res.status(200).json({ id: newUser._id, email: newUser.email });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    const authToken = `auth_${token}`;
    const userId = await redisClient.get(authToken);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
    } else {
      const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      res.json({ email: user.email, id: user._id });
    }
  }
}

export default UsersController;
