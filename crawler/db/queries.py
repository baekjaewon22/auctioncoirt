"""경매 물건 DB 저장 쿼리"""
from db.connection import get_connection


def upsert_auction_item(item: dict):
    """경매 물건 INSERT 또는 UPDATE"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO auction_items (
                case_no, item_no, court_id, address_full, sido, sigu, dong,
                item_type, item_detail, land_area, building_area, floor_info,
                appraisal_price, min_bid_price, sale_date, sale_time,
                status, fail_count,
                appraisal_pdf_url, survey_pdf_url, spec_pdf_url
            ) VALUES (
                %(case_no)s, %(item_no)s, %(court_id)s, %(address_full)s,
                %(sido)s, %(sigu)s, %(dong)s,
                %(item_type)s, %(item_detail)s, %(land_area)s, %(building_area)s,
                %(floor_info)s,
                %(appraisal_price)s, %(min_bid_price)s, %(sale_date)s, %(sale_time)s,
                %(status)s, %(fail_count)s,
                %(appraisal_pdf_url)s, %(survey_pdf_url)s, %(spec_pdf_url)s
            ) ON DUPLICATE KEY UPDATE
                address_full = VALUES(address_full),
                item_type = VALUES(item_type),
                item_detail = VALUES(item_detail),
                land_area = VALUES(land_area),
                building_area = VALUES(building_area),
                floor_info = VALUES(floor_info),
                appraisal_price = VALUES(appraisal_price),
                min_bid_price = VALUES(min_bid_price),
                sale_date = VALUES(sale_date),
                sale_time = VALUES(sale_time),
                status = VALUES(status),
                fail_count = VALUES(fail_count),
                appraisal_pdf_url = VALUES(appraisal_pdf_url),
                survey_pdf_url = VALUES(survey_pdf_url),
                spec_pdf_url = VALUES(spec_pdf_url),
                updated_at = NOW()
        """, item)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def insert_sale_history(history: dict):
    """매각기일 히스토리 저장"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO sale_history (
                auction_item_id, sale_date, min_bid_price,
                result, winning_price, bidder_count
            ) VALUES (
                %(auction_item_id)s, %(sale_date)s, %(min_bid_price)s,
                %(result)s, %(winning_price)s, %(bidder_count)s
            )
        """, history)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
