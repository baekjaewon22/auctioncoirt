import os
from dotenv import load_dotenv

load_dotenv()

# Database
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "database": os.getenv("DB_NAME", "auctioncourt"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
}

# Crawling
CRAWL_DELAY = int(os.getenv("CRAWL_DELAY", "3"))
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
MAX_PAGES = int(os.getenv("MAX_PAGES", "100"))

BASE_URL = "https://www.courtauction.go.kr"
SEARCH_PATH = "/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ157M00.xml"

# 법원 코드 (주요 법원)
COURT_CODES = {
    "서울중앙지방법원": "B000210",
    "서울동부지방법원": "B000220",
    "서울서부지방법원": "B000230",
    "서울남부지방법원": "B000240",
    "서울북부지방법원": "B000250",
    "수원지방법원": "B000410",
    "인천지방법원": "B000310",
    "부산지방법원": "B000610",
    "대구지방법원": "B000710",
    "대전지방법원": "B000810",
    "광주지방법원": "B000910",
}

# 물건 종류 코드
ITEM_TYPE_CODES = {
    "아파트": "000001",
    "오피스텔": "000002",
    "빌라/연립": "000003",
    "단독/다가구": "000004",
    "상가": "000005",
    "토지": "000006",
    "공장/창고": "000007",
}
