dc-build:
	 docker build -t tokopedia-scraper:latest .

dc-run:
	 docker-compose up -d

dc-rebuild:
	 docker-compose down
	 docker rmi tokopedia-scraper:latest
	 docker build -t tokopedia-scraper:latest .
	 docker-compose up -d
