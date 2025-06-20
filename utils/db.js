/*
 *
 *
 *
 */

import mongo from 'mongodb';

const client = mongo.MongoClient;

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const uri = `mongodb://${host}:${port}/`;
const uri1 = 'mongodb+srv://hajjaj:root@cluster0.h6dk4eo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

class DBClient {
  constructor() {
    this.db = null;
    client.connect(uri1, { useUnifiedTopology: true }, (err, client) => {
      if (err) console.log(`Mongodb client not connected ${err}`);
      this.db = client.db(database);
      this.db.createCollection('users');
      this.db.createCollection('files');
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
