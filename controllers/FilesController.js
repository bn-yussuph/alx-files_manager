/*
 *
 *
 *
 */

 import redisClient from '../utils/redis.js';
 import dbClient from '../utils/db.js';
 import fs from 'fs';
 import { v4 as uuid4 } from 'uuid';
 import mongo from 'mongodb';
 const { ObjectId } = mongo;


 class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const authToken = `auth_${token}`;
    const userId = await redisClient.get(authToken);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
    }
      const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

      if (!user) {
	res.status(401).json({ error: "Unauthorized" });
      }

      const allowTypes = ['folder', 'file', 'image'];
      const name = req.body.name;
      const type = req.body.type;
      const parentId = req.body.parentId;
      const isPublic = req.body.isPublic;
      const data = req.body.data;
      const user_id = user._id;
      if (!name) res.status(400).json({ error: "Missing name" });
      if (!type || !allowTypes.includes(type)) res.status(400).json({ error: "Missing type" });
      if(!data && (type != 'folder')) res.status(400).json({ error: "Missing data"} );
      if(parentId){
	const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId), userId });
	if (!parentFile){
	  res.status(400).json({ error: "Parent not found" });
	}
	if(parentFile.type !== folder){
	  res.status(400).json({ error: "Parent is not a folder" });
	}
      }
      const fileData = {
      userId,
      name,
      type,
      parentId: parentId ? ObjectId(parentId) : 0,
      isPublic: isPublic || false,
      data
      };
      if (type === 'folder'){
	const folder = await dbClient.db.collection('files').insertOne({...fileData});
	res.status(201).json({id: folder.insertedId, ...fileData });
	return;
      }
     const relPath = process.env.FOLDER_PATH || './temp/files_manager';
     if (!fs.existsSync(relPath)){
     	console.log(relPath);
	fs.mkdirSync((relPath), { recursive: true});
     }
	const identity = uuid4();
	const localPath = `${relPath}/${identity}`;
	fs.writeFile(localPath, data, 'base64', (err) => {
	if (err) console.log(err)
	});
	const newFile = await dbClient.db.collection('files').insertOne({ ...fileData, localPath: localPath });
	res.status(201).json({ id: newFile.insertedId, ...fileData });
   }
 }

 export default FilesController;
