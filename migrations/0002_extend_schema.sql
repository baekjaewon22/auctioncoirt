-- 기존 테이블에 마이옥션 상세 컬럼 추가
ALTER TABLE auction_items ADD COLUMN auction_type TEXT;         -- 경매종류
ALTER TABLE auction_items ADD COLUMN auction_target TEXT;       -- 경매대상
ALTER TABLE auction_items ADD COLUMN bid_method TEXT;           -- 입찰방법
ALTER TABLE auction_items ADD COLUMN bid_deposit INTEGER;       -- 입찰보증금
ALTER TABLE auction_items ADD COLUMN claim_amount INTEGER;      -- 청구금액
ALTER TABLE auction_items ADD COLUMN debtor TEXT;               -- 채무/소유자
ALTER TABLE auction_items ADD COLUMN creditor TEXT;             -- 채권자
ALTER TABLE auction_items ADD COLUMN related_case TEXT;         -- 관련사건
ALTER TABLE auction_items ADD COLUMN appraiser TEXT;            -- 감정원
ALTER TABLE auction_items ADD COLUMN appraisal_date TEXT;       -- 가격시점
ALTER TABLE auction_items ADD COLUMN appraisal_summary TEXT;    -- 감정평가 요약
ALTER TABLE auction_items ADD COLUMN building_structure TEXT;   -- 건물구조
ALTER TABLE auction_items ADD COLUMN land_use TEXT;             -- 용도지역
ALTER TABLE auction_items ADD COLUMN tenant_info TEXT;          -- 임차인현황 (JSON)
ALTER TABLE auction_items ADD COLUMN registry_info TEXT;        -- 등기부현황 (JSON)
ALTER TABLE auction_items ADD COLUMN expected_dividend TEXT;    -- 예상배당표 (JSON)
ALTER TABLE auction_items ADD COLUMN real_trade_info TEXT;      -- 국토부 실거래가 (JSON)
ALTER TABLE auction_items ADD COLUMN caution_notes TEXT;        -- 주의사항
ALTER TABLE auction_items ADD COLUMN documents TEXT;            -- 문서링크 (JSON)
ALTER TABLE auction_items ADD COLUMN all_images TEXT;           -- 전체 이미지 URL (JSON)
ALTER TABLE auction_items ADD COLUMN source_url TEXT;           -- 마이옥션 원본 URL
