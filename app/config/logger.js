const winston = require('winston');
const config = require('./config');

class LoggerService {
    constructor() {
        this.logger = winston.createLogger({
            level: config.LOGGING.LEVEL,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.simple()
                }),
                new winston.transports.File({ 
                    filename: config.LOGGING.FILE_PATH,
                    handleExceptions: true
                })
            ],
            exceptionHandlers: [
                new winston.transports.File({ 
                    filename: 'logs/exceptions.log' 
                })
            ]
        });
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, error) {
        this.logger.error(message, { 
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }
}

module.exports = new LoggerService();