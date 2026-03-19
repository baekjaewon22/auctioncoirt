"""MySQL 데이터베이스 연결 관리"""
import mysql.connector
from config import DB_CONFIG


def get_connection():
    """MySQL 연결 반환"""
    return mysql.connector.connect(**DB_CONFIG)


def execute_query(query: str, params: tuple = ()):
    """단일 쿼리 실행"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        conn.commit()
        return cursor
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """SELECT 쿼리 실행 후 결과 반환"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
