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
    const queue = new Queue('fileQueue');
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
  if (type === 'image') {
      queue.add({ userId, fileId: newFile.insertedId });
    }
}

   static async getShow(req, res) {
     const token = req.header('X-Token');
     const userId = await redisClient.get(`auth_${token}`);

     if (!userId) {
	res.status(401).json({ error: "Unauthorized "});
     }
     const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

     if(!user) {
	res.status(401).json({ error: "Unauthorized" });
     }
     const id = req.params.id || '';
     const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: user._Id });

     if(!file) {
     res.status(404).json({ error: "Not found" });
     }

     res.status(200).send({...file});

   }

   static async getIndex(req, res){
     const token = req.header('X-Token');
     const userId = await redisClient.get(`auth_${token}`);
     if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
     }
     const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

     if(!user) {
       res.status(401).json({ error: "Unauthorized" });
     }

     const parentId = req.params.parentId;
     const page = req.params.page|| 0;
     let filter;

     if (parentId) {
       filter = { _id: ObjectId(parentId), userId: user._id };
     } else {
       filter = { userId: user.id };
     }
     const result = await dbClient.db.collection('files').aggregate([
	{ $match: filter },
	{$skip: parseInt(page) * 20 },
	{ $limit: 20 },
	{ $project: {
		id: `$_id`, _id: 0, userId: 1, name: 1, rype: 1, isPublic: 1, parentId: 1 
		}
	}
     ]);
     const resultArray = await result.toArray();
     res.status(200).json(resultArray);
     return;
   }

   static async putPublish (request, response) {
     const token = req.header('X-Token');
     const userId = await redisClient.get(`auth_${token}`);
     if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
     }
    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const fileId = request.params.id || '';

    let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return response.status(404).send({ error: 'Not found' });

    await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

    return response.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId
    });
  }

   static async putUnpublish (request, response) {
    const token = req.header('X-Token');
     const userId = await redisClient.get(`auth_${token}`);
     if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
     }
    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const fileId = request.params.id || '';

    let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return response.status(404).send({ error: 'Not found' });

    await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

    return response.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId
    });
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const fileCollection = dbClient.db.collection('files');
    const file = await fileCollection.findOne({ _id: ObjectId(fileId) })

    if (!file) return res.status(404).json({ error: 'Not found' });

    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(id) });
    if ((!id || !user || file.userId.toString() !== id) && !file.isPublic) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (file.type === 'folder') {
      res.status(400).json({ error: `A folder doesn't have a content` });
      return;
    }

    const { size } = req.query;
    let fileLocalPath = file.localPath;
    if (size) {
      fileLocalPath = `${file.localPath}_${size}`;
    }

    if (!fs.existsSync(fileLocalPath)) return res.status(404).json({ error: 'Not found' });

    const data = await fs.promises.readFile(fileLocalPath);
    const headerContentType = mime.contentType(file.name);
    res.header('Content-Type', headerContentType).status(200).send(data);
  }
 }

 export default FilesController;
