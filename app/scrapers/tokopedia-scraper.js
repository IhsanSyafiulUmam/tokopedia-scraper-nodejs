const axios = require('axios');
const { parse } = require('json2csv');
const fs = require('fs').promises;
const amqp = require('amqplib');
const path = require('path');

const config = require('../config/config');
const logger = require('../config/logger');
const rateLimiter = require('../services/rate-limiter');
const errorHandler = require('../services/error-handler');

class TokopediaScraper {
    constructor(options = {}) {
        this.stateFilePath = path.join(__dirname, '../state.json');
        this.category = options.category || 'mesin-cuci';
        this.maxProducts = options.maxProducts || 1000; 
        this.rabbitMqUrl = config.RABBITMQ.URL; 
        this.queueName = 'product_queue'; 
        this.rowsPerPage = 60; 
    }

    async loadState() {
        try {
            const data = await fs.readFile(this.stateFilePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('No previous state found, starting fresh.');
            return { lastCursor: null, currentPage: 1 };
        }
    }

    async saveState(lastCursor, currentPage) {
        const state = { lastCursor, currentPage };
        await fs.writeFile(this.stateFilePath, JSON.stringify(state), 'utf-8');
        logger.info(`Saved state: ${JSON.stringify(state)}`);
    }



    async connectRabbitMQ() {
        this.connection = await amqp.connect(this.rabbitMqUrl);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.queueName, { durable: true });
    }

    async publishToQueue(product) {
        const message = JSON.stringify(product);
        this.channel.sendToQueue(this.queueName, Buffer.from(message), { persistent: true });
        logger.info(`Published product to queue: ${product.id}`);
    }


    _createHeaders(page) {
        return {
            'sec-ch-ua-platform': '"Android"',
            'Referer': `https://www.tokopedia.com/p/elektronik/elektronik-rumah-tangga/${encodeURIComponent(this.category)}?page=${page}`,
            'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
            'x-price-center': 'true',
            'iris_session_id': '',
            'X-Source': 'tokopedia-lite',
            'bd-device-id': '1358113141011131624',
            'Tkpd-UserId': '0',
            'sec-ch-ua-mobile': '?1',
            'x-device': 'desktop-0.0',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'accept': '*/*',
            'DNT': '1',
            'content-type': 'application/json',
            'X-Tkpd-Lite-Service': 'zeus',
        };
    }

    _createGraphQLQuery(page, start) {
        return JSON.stringify([{
            operationName: "SearchProductQuery",
            variables: {
                params: `page=${page}&ob=&identifier=elektronik_elektronik-rumah-tangga_${encodeURIComponent(this.category)}&sc=3964&user_id=0&rows=60&start=${start}&source=directory&device=desktop&page=${page}&related=true&st=product&safe_search=false`
            },
            query: `query SearchProductQuery($params: String) {
                CategoryProducts: searchProduct(params: $params) {
                    count
                    data: products {
                        id
                        url
                        imageUrl: image_url
                        imageUrlLarge: image_url_700
                        catId: category_id
                        gaKey: ga_key
                        countReview: count_review
                        discountPercentage: discount_percentage
                        preorder: is_preorder
                        name
                        price
                        priceInt: price_int
                        original_price
                        rating
                        wishlist
                        labels {
                            title
                            color
                            __typename
                        }
                        badges {
                            imageUrl: image_url
                            show
                            __typename
                        }
                        shop {
                            id
                            url
                            name
                            goldmerchant: is_power_badge
                            official: is_official
                            reputation
                            clover
                            location
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
            }`
        }]);
    }

    async _makeRequest(page, start) {
        const headers = this._createHeaders(page);
        const query = this._createGraphQLQuery(page, start);
        
        const axiosConfig = {
            headers,
        };

        try {
            const response = await rateLimiter.executeWithRateLimit(async () => {
                return await axios.post(
                    'https://gql.tokopedia.com/graphql/SearchProductQuery', 
                    query, 
                    axiosConfig
                );
            });


            const products = response.data[0].data.CategoryProducts.data;
            const totalCount = response.data[0].data.CategoryProducts.count;
            logger.info(`Fetched ${products.length} products per request`);
            logger.info(`Total ${totalCount} products per category`);

            for (const product of products) {
                await this.publishToQueue(product); 
            }

            return { products, totalCount };

        } catch (error) {
            const errorResult = await errorHandler.handleError(error, {
                category: this.category,
                page,
                start
            });

            if (errorResult.retry) {
                return this._makeRequest(page, start);
            }

            throw error;
        }
    }


    async scrapeProducts() {
        const state = await this.loadState();
        let allProducts = [];
        let page = state.currentPage || 1;
        let start = state.lastCursor || 1;
        let totalCount = 0;
        do {
            logger.info(`Scraping products for category: ${this.category}, starting at: ${start}`);

            try {
                const { products, totalCount: fetchedCount } = await this._makeRequest(page, start);
                
                if (products.length === 0) break;

                allProducts.push(...products);
                totalCount = fetchedCount;

                await this.saveState(start, page);

                start += this.rowsPerPage;

                await new Promise(resolve => 
                    setTimeout(resolve, config.SCRAPING.PAGE_DELAY)
                );

                if (start > allProducts.length) {
                    page++; 
                }

            } catch (error) {
                logger.error(`Error scraping products`, error);
                break; 
            }
        } while (allProducts.length < Math.min(totalCount, this.maxProducts) && start <= totalCount);

        return allProducts;
    }

    async exportToCsv(products) {
        try {
            const csvData = products.map(product => ({
                id: product.id,
                name: product.name,
                salesPrice: product.price,
                originalPrice: product.original_price,
                discountPercentage: product.discountPercentage,
                rating: product.rating,
                countReview: product.countReview,
                productUrl: product.url,
                imageUrl: product.imageUrl,
                shopName: product.shop.name,
                shopUrl: product.shop.url,
                shopLocation: product.shop.location,
                isGoldMerchant: product.shop.goldmerchant,
                isOfficial: product.shop.official,
                preorder: product.preorder,
            }));

            await fs.mkdir('logs', { recursive: true });
            await fs.mkdir('output', { recursive: true });

            const csv = parse(csvData);
            const filename = `output/tokopedia_${this.category.replace(' ', '_')}_products_${csvData.length}_${Date.now()}.csv`;
            
            await fs.writeFile(filename, csv, 'utf-8');
            
            logger.info(`Exported ${csvData.length} products to ${filename}`);
            return filename;
        } catch (error) {
            logger.error('CSV export failed', error);
            throw error;
        }
    }

    async run() {
        await this.connectRabbitMQ(); 
        try {
            const products = await this.scrapeProducts();
            
            if (products.length > 0) {
                await this.exportToCsv(products);
            } else {
                logger.warn('No products found');
            }

            return products;
        } catch (error) {
            logger.error('Scraping process failed', error);
            throw error;
        }
    }
}

module.exports = TokopediaScraper;
