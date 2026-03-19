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
PAGE_SIZE = 40  # 한 페이지당 최대 물건 수

BASE_URL = "https://www.courtauction.go.kr"
# WebSquare 기반 검색 API 엔드포인트
SEARCH_API_URL = f"{BASE_URL}/pgj/pgjsearch/searchControllerMain.on"
# 물건 상세 페이지 XML
DETAIL_PAGE_URL = f"{BASE_URL}/pgj/ui/pgj100/PGJ15BM01.xml"
CASE_DETAIL_URL = f"{BASE_URL}/pgj/ui/pgj100/PGJ15AF01.xml"

# 법원 코드 (주요 법원) - courtauction.go.kr 기준
COURT_CODES = {
    "서울중앙지방법원": "B000210",
    "서울동부지방법원": "B000220",
    "서울서부지방법원": "B000230",
    "서울남부지방법원": "B000240",
    "서울북부지방법원": "B000250",
    "의정부지방법원": "B000260",
    "수원지방법원": "B000410",
    "인천지방법원": "B000310",
    "부산지방법원": "B000610",
    "대구지방법원": "B000710",
    "대전지방법원": "B000810",
    "광주지방법원": "B000910",
    "울산지방법원": "B000620",
    "창원지방법원": "B000630",
    "전주지방법원": "B000920",
    "청주지방법원": "B000820",
    "춘천지방법원": "B000270",
    "제주지방법원": "B000940",
}

# 시도 코드 (소재지 검색용)
SIDO_CODES = {
    "서울": "11",
    "부산": "26",
    "대구": "27",
    "인천": "28",
    "광주": "29",
    "대전": "30",
    "울산": "31",
    "세종": "36",
    "경기": "41",
    "강원": "42",
    "충북": "43",
    "충남": "44",
    "전북": "45",
    "전남": "46",
    "경북": "47",
    "경남": "48",
    "제주": "50",
}

# 물건 용도 대분류 코드
ITEM_TYPE_CODES = {
    "주거용 건물": "0001",
    "업무/상업용 건물": "0002",
    "토지": "0003",
    "산업용 건물": "0004",
    "기타": "0005",
}

# 물건 용도 중분류 코드 (주거용 기준)
RESIDENTIAL_SUB_CODES = {
    "아파트": "000101",
    "오피스텔": "000102",
    "연립/다세대": "000103",
    "단독/다가구": "000104",
    "주상복합": "000105",
}
