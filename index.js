require('dotenv').config();
const TokopediaScraper = require('./app/scrapers/tokopedia-scraper');
const logger = require('./app/config/logger');

async function main() {
    try {
        logger.info('Scrapper running');
        const scraper = new TokopediaScraper({
            category: 'mesin-cuci', 
            maxProducts: 895400
        });

        logger.info('scrapper running');

        const products = await scraper.run();

        console.log(`Total products scraped: ${products.length}`);
    } catch (error) {
        logger.error('Scraping failed', error);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main();