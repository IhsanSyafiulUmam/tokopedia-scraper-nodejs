# Tokopedia Scraper Node.js

This project is a web scraper for Tokopedia, built using Node.js. It allows you to extract product information from Tokopedia.

## Features

- Scrape product details such as name, price, and rating based on category.
- Export scraped data to a CSV file.
- Handle pagination to scrape multiple pages.
- Save raw data to MongoDB using separate service via RabbitMQ.
- Error handling for rate limits and network errors with retry logic.
- Custom rate limit handler to avoid hitting the platform's rate limits.
- Resume scraping from the last saved state (last_cursor and page) stored locally in `state.json` to prevent restarting from the beginning after an interruption.
- Utilize Tokopedia's GraphQL API for faster and more sustainable scraping compared to scraping based on HTML structure.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/tokopedia-scraper-nodejs.git
    ```
2. Navigate to the project directory:
    ```bash
    cd tokopedia-scraper-nodejs
    ```
3. Install the dependencies:
    ```bash
    npm install
    ```

## Configuration

The `config.js` file contains the following settings:

- `BASE_URL`: The base URL of Tokopedia.
- `SEARCH_QUERY`: The search query for the products you want to scrape.
- `MAX_PAGES`: The maximum number of pages to scrape.

## Running the Project

To run the project, follow these steps:

1. First, start the product saver service. This service is responsible for saving the scraped product data to a file. You can start it using either of the following commands:
    ```bash
    node app/services/product-saver.js
    ```
    or
    ```bash
    npm run start:product-saver
    ```
2. Once the product saver service is running, you can start the scraper to begin scraping product data from Tokopedia:
    ```bash
    npm run dev:start-scraping
    ```

The product saver service must be running before you start the scraper to ensure that the scraped data is saved correctly.

