const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            throw new Error('MongoDB connection string is not defined in environment variables');
        }

        // Connect without deprecated options
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4, // Use IPv4, skip trying IPv6
            maxPoolSize: 10, // Maximum number of connections in the pool
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database Name: ${conn.connection.name}`);
        console.log(`MongoDB Connection State: ${conn.connection.readyState}`);

        // Enhanced event listeners
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            if (err.code) console.error('Error Code:', err.code);
            if (err.syscall) console.error('System Call:', err.syscall);
            if (err.hostname) console.error('Hostname:', err.hostname);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            console.log('Connection State:', mongoose.connection.readyState);
            console.log('Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

        conn.connection.on('connected', () => {
            console.log('Mongoose connected to DB');
        });

        conn.connection.on('reconnectFailed', () => {
            console.error('MongoDB reconnection failed');
            process.exit(1);
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error while closing MongoDB connection:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        if (error.name) console.error('Error Name:', error.name);
        if (error.code) console.error('Error Code:', error.code);
        process.exit(1); // Exit with failure
    }
};

// Connection status checker
const checkConnection = () => {
    const state = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
};

module.exports = {
    connectDB,
    checkConnection
};
