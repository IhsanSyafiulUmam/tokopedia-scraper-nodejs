const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

async function connectToMongoDB() {
    try {
        await mongoose.connect(config.MONGODB.URI);
        logger.info('Connected to MongoDB successfully');
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        process.exit(1); 
    }
}

module.exports = {
    connectToMongoDB,
};
