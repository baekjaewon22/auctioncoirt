-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 사용자별 설정 (마이옥션 계정, API 키 등)
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  UNIQUE(user_id, setting_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 사용자별 크롤링된 물건 연결
ALTER TABLE auction_items ADD COLUMN user_id INTEGER DEFAULT 0;

-- 블로그 발행 이력
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  auction_item_id INTEGER NOT NULL,
  platform TEXT NOT NULL,          -- 'naver' or 'tistory'
  post_title TEXT,
  post_content TEXT,
  post_url TEXT,                   -- 발행된 블로그 URL
  status TEXT DEFAULT 'draft',     -- draft, published, failed
  ai_prompt TEXT,                  -- 사용된 프롬프트
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (auction_item_id) REFERENCES auction_items(id)
);

CREATE INDEX IF NOT EXISTS idx_items_user ON auction_items(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user ON user_settings(user_id);
