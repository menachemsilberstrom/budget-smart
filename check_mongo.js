import mongoose from "mongoose";
import dotenv from "dotenv";
import 'dotenv/config';

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);        
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectDB();
