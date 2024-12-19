module.exports = {
    SCRAPING: {
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        PAGE_DELAY: 2000,
    },
    RATE_LIMITING: {
        MAX_REQUESTS_PER_MINUTE: 10,
        CONCURRENT_REQUESTS: 3,
    },
    MONGODB: {
        URI: 'mongodb://localhost:27017/tokopedia', 
    },
    RABBITMQ: {
        URL: 'amqp://localhost',
    },
    LOGGING: {
        LEVEL: 'info',
        FILE_PATH: 'logs/scraper.log',
    }
};