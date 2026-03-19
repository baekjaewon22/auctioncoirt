-- 법원 마스터
CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court_code TEXT NOT NULL UNIQUE,
  court_name TEXT NOT NULL,
  region TEXT
);

-- 지역코드 마스터
CREATE TABLE IF NOT EXISTS region_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sido_code TEXT NOT NULL,
  sido_name TEXT NOT NULL,
  sigu_code TEXT,
  sigu_name TEXT,
  dong_code TEXT,
  dong_name TEXT,
  UNIQUE(sido_code, sigu_code, dong_code)
);

-- 경매 물건 (메인)
CREATE TABLE IF NOT EXISTS auction_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_no TEXT NOT NULL,
  item_no INTEGER NOT NULL DEFAULT 1,
  court_id INTEGER NOT NULL,

  -- 소재지
  address_full TEXT,
  sido TEXT,
  sigu TEXT,
  dong TEXT,
  latitude REAL,
  longitude REAL,

  -- 물건 정보
  item_type TEXT,
  item_detail TEXT,
  land_area REAL,
  building_area REAL,
  floor_info TEXT,

  -- 가격 정보
  appraisal_price INTEGER,
  min_bid_price INTEGER,
  bid_rate REAL,

  -- 일정
  sale_date TEXT,
  sale_time TEXT,

  -- 진행상태
  status TEXT DEFAULT '신건',
  fail_count INTEGER DEFAULT 0,

  -- 낙찰 결과
  winning_price INTEGER,
  winning_rate REAL,

  -- 문서 링크
  appraisal_pdf_url TEXT,
  survey_pdf_url TEXT,
  spec_pdf_url TEXT,

  -- 메타
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(case_no, item_no),
  FOREIGN KEY (court_id) REFERENCES courts(id)
);

-- 매각기일 히스토리
CREATE TABLE IF NOT EXISTS sale_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_item_id INTEGER NOT NULL,
  sale_date TEXT,
  min_bid_price INTEGER,
  result TEXT,
  winning_price INTEGER,
  bidder_count INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (auction_item_id) REFERENCES auction_items(id)
);

-- 임차인 현황
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_item_id INTEGER NOT NULL,
  tenant_type TEXT,
  deposit INTEGER,
  move_in_date TEXT,
  is_priority INTEGER DEFAULT 0,
  FOREIGN KEY (auction_item_id) REFERENCES auction_items(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_items_sido_sigu ON auction_items(sido, sigu);
CREATE INDEX IF NOT EXISTS idx_items_type ON auction_items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_sale_date ON auction_items(sale_date);
CREATE INDEX IF NOT EXISTS idx_items_price ON auction_items(appraisal_price);
CREATE INDEX IF NOT EXISTS idx_items_status ON auction_items(status);
CREATE INDEX IF NOT EXISTS idx_history_item ON sale_history(auction_item_id);
CREATE INDEX IF NOT EXISTS idx_tenants_item ON tenants(auction_item_id);
