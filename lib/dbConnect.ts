import mongoose from 'mongoose';

async function dbConnect() {
  const MONGODB_URI = process.env.DATABASE_URL;

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local',
    );
  }
    const conn = mongoose.connect(MONGODB_URI, {}).then((mongoose) => {
      return mongoose;
    });
 
}

export default dbConnect;
