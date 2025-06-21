/*
 *
 *
 *
 */
import sha1 from 'sha1';
import dbClient from '../utils/db.js';

class UsersController {
  static async postNew(req, res) {
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
        res.status(200).json({ id: newUser._id, email: newUser.email });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
