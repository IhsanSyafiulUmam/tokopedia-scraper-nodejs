const config = require('../config/config');
const logger = require('../config/logger');

class RateLimiter {
    constructor() {
        this.requestTimestamps = [];
        this.concurrentRequests = 0;
    }

    async waitForRequestSlot() {
        return new Promise((resolve) => {
            const checkSlot = () => {
                const now = Date.now();
                
                this.requestTimestamps = this.requestTimestamps.filter(
                    timestamp => now - timestamp < 60000
                );

                if (this.requestTimestamps.length < config.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE &&
                    this.concurrentRequests < config.RATE_LIMITING.CONCURRENT_REQUESTS) {
                    
                    this.requestTimestamps.push(now);
                    this.concurrentRequests++;
                    resolve();
                } else {
                    setTimeout(checkSlot, 500);
                }
            };

            checkSlot();
        });
    }

    releaseRequestSlot() {
        this.concurrentRequests--;
    }

    async executeWithRateLimit(asyncFunction) {
        await this.waitForRequestSlot();
        
        try {
            return await asyncFunction();
        } catch (error) {
            logger.error('Rate-limited request failed', error);
            throw error;
        } finally {
            this.releaseRequestSlot();
        }
    }
}

module.exports = new RateLimiter();