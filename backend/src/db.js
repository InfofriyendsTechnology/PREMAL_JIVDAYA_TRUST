import mongoose from 'mongoose';

const connectDB = async (retryCount = 0) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,  // 10s to find a server
      connectTimeoutMS: 10000,          // 10s to establish connection
      socketTimeoutMS: 45000,           // 45s socket idle timeout
      family: 4,                        // Force IPv4 (avoids IPv6 SRV issues)
    });
    console.log('✅ MongoDB connected → premal_jivdaya');
  } catch (err) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}):`, err.message);
    console.log('🔄 Retrying MongoDB connection in 5 seconds...');
    // Retry every 5s - server stays alive instead of crashing
    setTimeout(() => connectDB(retryCount + 1), 5000);
  }
};

export default connectDB;
