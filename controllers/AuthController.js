/*
 *
 *
 */
import sha1 from 'sha1';
import { v4 as uuid4 } from 'uuid';
import redisClient from '../utils/redis.js'
import dbClient from '../utils/db.js';
import mongo from 'mongodb';
const { ObjectId } = mongo;

class AuthController {
  static async getConnect(req, res) {
    const auth = req.headers.authorization;
    if(!auth) {
    	console.log(`no headers: ${auth}`);
	res.status(401).json({ error: "Unauthorized" });
    }
    try {
    	const authDecoded = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
	if (!authDecoded || authDecoded.length !== 2){
	  console.log(`No valid cred: ${authDecoded}`);
	  res.status(401).json({ error: "Unauthorized" });
	}
	const email = authDecoded[0];
	const pass = authDecoded[1];

	const user = await dbClient.db.collection('users').findOne({ email: email, password: sha1(pass) });
	console.log(`User: ${user}`);

	if(!user) {
	res.status(401).json({ error: "Unauthorized" });
	} else {
	console.log(`Not a registered user: ${user}`);
	const authToken = uuid4();
	const authKey = `auth_${authToken}`;
	await redisClient.set(authKey, user._id.toString(), 60 * 60 * 24);
	res.status(200).json({ token: authToken });
	}
    } catch (error) {
    	console.log(error);
    }
  }

  static async getDisconnect(req, res) {
   const token = req.header('X-Token');
   const userId = await redisClient.get(`auth_${token}`);

   const user = dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

   if(!user) {
     res.status(401).json({ error: "Unauthorized"});
   } else {
     redisClient.del(`auth_${token}`);
     res.status(204).send();
   }
  }
}

export default AuthController;
