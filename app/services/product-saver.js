const amqp = require('amqplib');
const Product = require('../models/Product');
const { connectToMongoDB } = require('../config/db');
const config = require('../config/config');
const logger = require('../config/logger');

async function startConsumer() {
    const connection = await amqp.connect(config.RABBITMQ.URL);
    const channel = await connection.createChannel();
    const queueName = 'product_queue';

    await connectToMongoDB();
    await channel.assertQueue(queueName, { durable: true });

    console.log('Waiting for messages in %s', queueName);

    channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const product = JSON.parse(msg.content.toString());
            try {
                const updatedProduct = await Product.findOneAndUpdate(
                    { id: product.id },
                    product, 
                    { new: true, upsert: true } 
                );

                logger.info('Product saved/updated in MongoDB:', updatedProduct.id);
                channel.ack(msg); 
            } catch (error) {
                logger.error('Error saving/updating product to MongoDB:', error);
                channel.nack(msg);
            }
        }
    });
}

startConsumer().catch(console.error);
