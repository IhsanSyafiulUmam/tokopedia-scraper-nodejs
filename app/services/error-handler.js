const logger = require('../config/logger');

class ErrorHandler {
    constructor() {
        this.retryStrategies = {
            networkError: this.networkErrorStrategy,
            rateLimitError: this.rateLimitStrategy,
        };
    }

    async handleError(error, context = {}) {
        const errorType = this.classifyError(error);
        
        logger.error(`Error occurred: ${errorType}`, {
            error: error.message,
            stack: error.stack,
            context
        });

        const strategy = this.retryStrategies[errorType];
        
        if (strategy) {
            return await strategy(error, context);
        }

        throw error;
    }

    classifyError(error) {
        if (error.response && error.response.status === 429) {
            return 'rateLimitError';
        }
        
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            return 'networkError';
        }
        

        return 'unknownError';
    }

    async networkErrorStrategy(error, context) {
        const maxRetries = context.maxRetries || 3;
        const currentRetry = context.currentRetry || 0;

        if (currentRetry < maxRetries) {
            const delay = Math.pow(2, currentRetry) * 1000;
            
            logger.warn(`Network error. Retrying in ${delay}ms`, {
                retry: currentRetry + 1,
                maxRetries
            });

            await new Promise(resolve => setTimeout(resolve, delay));

            return {
                retry: true,
                context: {
                    ...context,
                    currentRetry: currentRetry + 1
                }
            };
        }

        return { retry: false };
    }

    async rateLimitStrategy(error, context) {
        const retryAfter = error.response.headers['retry-after'] || 30;
        
        logger.warn(`Rate limited. Waiting for ${retryAfter} seconds.`);
        
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

        return {
            retry: true,
            context
        };
    }
}

module.exports = new ErrorHandler();