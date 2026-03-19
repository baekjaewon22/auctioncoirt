"""경매 물건 DB 저장 쿼리"""
from db.connection import get_connection
from utils.logger import setup_logger

logger = setup_logger("db")


def get_or_create_court(court_code: str, court_name: str, region: str = "") -> int:
    """법원 레코드 조회 또는 생성, ID 반환"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM courts WHERE court_code = %s", (court_code,)
        )
        row = cursor.fetchone()
        if row:
            return row["id"]

        cursor.execute(
            "INSERT INTO courts (court_code, court_name, region) VALUES (%s, %s, %s)",
            (court_code, court_name, region),
        )
        conn.commit()
        return cursor.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def upsert_auction_item(item: dict) -> int:
    """경매 물건 INSERT 또는 UPDATE, ID 반환"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO auction_items (
                case_no, item_no, court_id, address_full, sido, sigu, dong,
                item_type, item_detail, land_area, building_area, floor_info,
                appraisal_price, min_bid_price, bid_rate, sale_date, sale_time,
                status, fail_count, latitude, longitude,
                appraisal_pdf_url, survey_pdf_url, spec_pdf_url
            ) VALUES (
                %(case_no)s, %(item_no)s, %(court_id)s, %(address_full)s,
                %(sido)s, %(sigu)s, %(dong)s,
                %(item_type)s, %(item_detail)s, %(land_area)s, %(building_area)s,
                %(floor_info)s,
                %(appraisal_price)s, %(min_bid_price)s, %(bid_rate)s,
                %(sale_date)s, %(sale_time)s,
                %(status)s, %(fail_count)s, %(latitude)s, %(longitude)s,
                %(appraisal_pdf_url)s, %(survey_pdf_url)s, %(spec_pdf_url)s
            ) ON DUPLICATE KEY UPDATE
                address_full = VALUES(address_full),
                sido = VALUES(sido),
                sigu = VALUES(sigu),
                dong = VALUES(dong),
                item_type = VALUES(item_type),
                item_detail = VALUES(item_detail),
                land_area = VALUES(land_area),
                building_area = VALUES(building_area),
                floor_info = VALUES(floor_info),
                appraisal_price = VALUES(appraisal_price),
                min_bid_price = VALUES(min_bid_price),
                bid_rate = VALUES(bid_rate),
                sale_date = VALUES(sale_date),
                sale_time = VALUES(sale_time),
                status = VALUES(status),
                fail_count = VALUES(fail_count),
                latitude = COALESCE(VALUES(latitude), latitude),
                longitude = COALESCE(VALUES(longitude), longitude),
                appraisal_pdf_url = COALESCE(VALUES(appraisal_pdf_url), appraisal_pdf_url),
                survey_pdf_url = COALESCE(VALUES(survey_pdf_url), survey_pdf_url),
                spec_pdf_url = COALESCE(VALUES(spec_pdf_url), spec_pdf_url),
                updated_at = NOW()
        """, item)
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        conn.rollback()
        logger.error(f"DB upsert 오류 ({item.get('case_no')}): {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def insert_sale_history(history: dict):
    """매각기일 히스토리 저장 (중복 무시)"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT IGNORE INTO sale_history (
                auction_item_id, sale_date, min_bid_price,
                result, winning_price, bidder_count
            ) VALUES (
                %(auction_item_id)s, %(sale_date)s, %(min_bid_price)s,
                %(result)s, %(winning_price)s, %(bidder_count)s
            )
        """, history)
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"히스토리 저장 오류: {e}")
    finally:
        cursor.close()
        conn.close()


def get_items_without_coords(limit: int = 100) -> list[dict]:
    """좌표가 없는 물건 목록 조회 (지오코딩용)"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, case_no, address_full
            FROM auction_items
            WHERE (latitude IS NULL OR longitude IS NULL)
              AND address_full IS NOT NULL AND address_full != ''
            LIMIT %s
        """, (limit,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def update_coords(item_id: int, lat: float, lng: float):
    """물건의 좌표 업데이트"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE auction_items SET latitude = %s, longitude = %s WHERE id = %s",
            (lat, lng, item_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def get_crawl_stats() -> dict:
    """크롤링 통계 조회"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as geocoded,
                COUNT(CASE WHEN sale_date >= CURDATE() THEN 1 END) as upcoming,
                MIN(created_at) as first_crawled,
                MAX(updated_at) as last_updated
            FROM auction_items
        """)
        return cursor.fetchone() or {}
    finally:
        cursor.close()
        conn.close()
