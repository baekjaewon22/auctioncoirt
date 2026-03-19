"""MySQL → Cloudflare D1 데이터 동기화

MySQL에 크롤링된 데이터를 Cloudflare D1으로 업로드합니다.
wrangler CLI를 이용하여 SQL 문을 실행합니다.

사용법:
    python sync_d1.py              # 전체 동기화
    python sync_d1.py --since 24   # 최근 24시간 데이터만
    python sync_d1.py --limit 100  # 최대 100건
"""
import argparse
import json
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from db.connection import get_connection
from utils.logger import setup_logger

logger = setup_logger("sync_d1")

D1_DB_NAME = "auctioncourt-db"


def fetch_items(since_hours: int = 0, limit: int = 0) -> list[dict]:
    """MySQL에서 동기화할 물건 목록 조회"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conditions = []
        params = []

        if since_hours > 0:
            since = datetime.now() - timedelta(hours=since_hours)
            conditions.append("a.updated_at >= %s")
            params.append(since.strftime("%Y-%m-%d %H:%M:%S"))

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        limit_clause = f"LIMIT {limit}" if limit > 0 else ""

        cursor.execute(f"""
            SELECT a.*, c.court_code, c.court_name
            FROM auction_items a
            LEFT JOIN courts c ON a.court_id = c.id
            {where}
            ORDER BY a.updated_at DESC
            {limit_clause}
        """, tuple(params))

        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def fetch_courts() -> list[dict]:
    """MySQL에서 법원 목록 조회"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM courts ORDER BY id")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def generate_sql(courts: list[dict], items: list[dict]) -> str:
    """D1에 삽입할 SQL 문 생성"""
    lines = []

    # 법원 데이터
    for court in courts:
        code = _esc(court["court_code"])
        name = _esc(court["court_name"])
        region = _esc(court.get("region", ""))
        lines.append(
            f"INSERT OR REPLACE INTO courts (id, court_code, court_name, region) "
            f"VALUES ({court['id']}, '{code}', '{name}', '{region}');"
        )

    # 물건 데이터
    for item in items:
        cols = [
            "case_no", "item_no", "court_id", "address_full", "sido", "sigu", "dong",
            "item_type", "item_detail", "land_area", "building_area", "floor_info",
            "appraisal_price", "min_bid_price", "bid_rate", "sale_date", "sale_time",
            "status", "fail_count", "winning_price", "winning_rate",
            "latitude", "longitude",
            "appraisal_pdf_url", "survey_pdf_url", "spec_pdf_url",
        ]

        values = []
        for col in cols:
            v = item.get(col)
            if v is None:
                values.append("NULL")
            elif isinstance(v, (int, float)):
                values.append(str(v))
            else:
                values.append(f"'{_esc(str(v))}'")

        cols_str = ", ".join(cols)
        vals_str = ", ".join(values)

        lines.append(
            f"INSERT OR REPLACE INTO auction_items ({cols_str}) "
            f"VALUES ({vals_str});"
        )

    return "\n".join(lines)


def execute_d1_sql(sql: str):
    """wrangler CLI를 사용해 D1에 SQL 실행"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        sql_path = f.name

    logger.info(f"D1 SQL 파일 생성: {sql_path}")

    try:
        result = subprocess.run(
            ["npx", "wrangler", "d1", "execute", D1_DB_NAME, "--remote", f"--file={sql_path}"],
            capture_output=True, text=True, timeout=120,
            cwd=str(Path(__file__).parent.parent),  # 프로젝트 루트
        )

        if result.returncode == 0:
            logger.info("D1 동기화 성공")
            logger.debug(result.stdout[:500])
        else:
            logger.error(f"D1 동기화 실패: {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        logger.error("D1 동기화 타임아웃 (120초)")
    except FileNotFoundError:
        logger.error("wrangler CLI를 찾을 수 없습니다. npm install -g wrangler")


def _esc(s: str) -> str:
    """SQL 문자열 이스케이프"""
    return s.replace("'", "''") if s else ""


def main():
    parser = argparse.ArgumentParser(description="MySQL → D1 동기화")
    parser.add_argument("--since", type=int, default=0,
                        help="최근 N시간 데이터만 (0=전체)")
    parser.add_argument("--limit", type=int, default=0,
                        help="최대 건수 (0=무제한)")
    parser.add_argument("--dry-run", action="store_true",
                        help="SQL만 출력하고 실행하지 않음")
    args = parser.parse_args()

    logger.info("=== MySQL → D1 동기화 시작 ===")

    courts = fetch_courts()
    items = fetch_items(args.since, args.limit)
    logger.info(f"동기화 대상: 법원 {len(courts)}개, 물건 {len(items)}건")

    if not items and not courts:
        logger.info("동기화할 데이터 없음")
        return

    sql = generate_sql(courts, items)

    if args.dry_run:
        print(sql)
        logger.info(f"(dry-run) SQL {len(sql.splitlines())}줄 생성됨")
    else:
        execute_d1_sql(sql)

    logger.info("=== 동기화 완료 ===")


if __name__ == "__main__":
    main()
