"""JSON 파일 → Cloudflare D1 업로드

MySQL 없이 크롤링 결과 JSON을 직접 D1에 업로드합니다.
--dry-run 모드로 크롤링한 output/*.json 파일을 활용합니다.

사용법:
    python sync_d1_json.py output/crawl_court_20260319_020000.json
    python sync_d1_json.py output/crawl_court_20260319_020000.json --dry-run
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from utils.logger import setup_logger

logger = setup_logger("sync_d1_json")

D1_DB_NAME = "auctioncourt-db"


def load_json(filepath: str) -> list[dict]:
    """JSON 파일 로드"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("items", [])
    logger.info(f"JSON 로드: {filepath} ({len(items)}건)")
    return items


def generate_sql(items: list[dict]) -> str:
    """D1 INSERT SQL 생성"""
    lines = []
    court_set = set()

    for item in items:
        # 법원 데이터 (중복 제거)
        court_code = item.get("court_code", "")
        court_name = item.get("court_name", "")
        if court_code and court_code not in court_set:
            court_set.add(court_code)
            lines.append(
                f"INSERT OR IGNORE INTO courts (court_code, court_name) "
                f"VALUES ('{_esc(court_code)}', '{_esc(court_name)}');"
            )

        # 물건 데이터
        case_no = _esc(item.get("case_no", ""))
        if not case_no:
            continue

        court_id_sub = (
            f"(SELECT id FROM courts WHERE court_code = '{_esc(court_code)}')"
            if court_code else "1"
        )

        values = {
            "case_no": f"'{case_no}'",
            "item_no": str(item.get("item_no", 1)),
            "court_id": court_id_sub,
            "address_full": _sql_val(item.get("address_full")),
            "sido": _sql_val(item.get("sido")),
            "sigu": _sql_val(item.get("sigu")),
            "dong": _sql_val(item.get("dong")),
            "item_type": _sql_val(item.get("item_type")),
            "item_detail": _sql_val(item.get("item_detail")),
            "appraisal_price": _num_val(item.get("appraisal_price")),
            "min_bid_price": _num_val(item.get("min_bid_price")),
            "bid_rate": _num_val(item.get("bid_rate")),
            "sale_date": _sql_val(item.get("sale_date")),
            "sale_time": _sql_val(item.get("sale_time")),
            "status": _sql_val(item.get("status")),
            "fail_count": _num_val(item.get("fail_count")),
        }

        cols = ", ".join(values.keys())
        vals = ", ".join(values.values())

        lines.append(
            f"INSERT OR REPLACE INTO auction_items ({cols}) VALUES ({vals});"
        )

    return "\n".join(lines)


def execute_d1(sql: str):
    """wrangler로 D1 실행"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        sql_path = f.name

    try:
        result = subprocess.run(
            ["npx", "wrangler", "d1", "execute", D1_DB_NAME, "--remote", f"--file={sql_path}"],
            capture_output=True, text=True, timeout=120,
            cwd=str(Path(__file__).parent.parent),
        )
        if result.returncode == 0:
            logger.info("D1 업로드 성공")
        else:
            logger.error(f"D1 업로드 실패: {result.stderr[:500]}")
    except Exception as e:
        logger.error(f"D1 실행 오류: {e}")


def _esc(s: str) -> str:
    return s.replace("'", "''") if s else ""


def _sql_val(v) -> str:
    if v is None or v == "":
        return "NULL"
    return f"'{_esc(str(v))}'"


def _num_val(v) -> str:
    if v is None:
        return "NULL"
    return str(v)


def main():
    parser = argparse.ArgumentParser(description="JSON → D1 업로드")
    parser.add_argument("file", help="크롤링 결과 JSON 파일 경로")
    parser.add_argument("--dry-run", action="store_true", help="SQL만 출력")
    args = parser.parse_args()

    items = load_json(args.file)
    if not items:
        logger.info("업로드할 데이터 없음")
        return

    sql = generate_sql(items)
    logger.info(f"SQL 생성: {len(sql.splitlines())}줄")

    if args.dry_run:
        print(sql)
    else:
        execute_d1(sql)


if __name__ == "__main__":
    main()
