"""법원경매 크롤러 메인 실행

사용법:
    python main.py [모드] [옵션]

모드:
    crawl     물건상세검색 크롤링 (기본값)
    geocode   좌표 없는 물건 지오코딩
    stats     DB 통계 조회

옵션:
    --dry-run    DB 저장 없이 결과를 JSON으로 출력
    --limit N    최대 페이지 수 제한 (기본 1)
"""
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

from browser import BrowserManager, init_search_page, click_search, get_result_text, get_total_count, wait_between_requests
from parsers.list_parser import parse_result_text
from config import MAX_PAGES
from utils.logger import setup_logger

logger = setup_logger()
OUTPUT_DIR = Path(__file__).parent / "output"


def save_items_to_db(items: list[dict]):
    """수집한 물건들을 MySQL에 저장"""
    from db.queries import upsert_auction_item, get_or_create_court

    saved = 0
    for item in items:
        court_name = item.get("court_name", "")
        court_code = item.get("court_code", "")
        if court_name and not court_code:
            # 법원 코드가 없으면 이름으로 DB에서 생성/조회
            try:
                court_id = get_or_create_court(court_code or "UNKNOWN", court_name)
                item["court_id"] = court_id
            except Exception:
                item["court_id"] = 0
        else:
            item.setdefault("court_id", 0)

        # DB 저장에 필요한 기본값
        for field in ["land_area", "building_area", "floor_info", "bid_rate",
                       "latitude", "longitude", "appraisal_pdf_url",
                       "survey_pdf_url", "spec_pdf_url"]:
            item.setdefault(field, None)
        item.setdefault("item_no", 1)

        try:
            upsert_auction_item(item)
            saved += 1
        except Exception as e:
            logger.error(f"  저장 실패 ({item.get('case_no')}): {e}")

    logger.info(f"DB 저장: {saved}/{len(items)}건")


def save_json(all_items: list[dict], label: str) -> Path:
    """크롤링 결과를 JSON 파일로 저장"""
    OUTPUT_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = OUTPUT_DIR / f"crawl_{label}_{timestamp}.json"

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(
            {"crawled_at": datetime.now().isoformat(), "count": len(all_items), "items": all_items},
            f, ensure_ascii=False, indent=2,
        )
    logger.info(f"JSON 저장: {filepath} ({len(all_items)}건)")
    return filepath


def crawl(page, dry_run: bool, max_pages: int) -> list[dict]:
    """물건상세검색 페이지에서 크롤링"""
    # 1. 검색 실행
    click_search(page)

    # 2. 결과 텍스트 추출
    text = get_result_text(page)
    total_count = get_total_count(text)
    logger.info(f"총 {total_count}건 검색됨")

    # 3. 첫 페이지 파싱
    items, _ = parse_result_text(text)
    all_items = list(items)
    logger.info(f"1페이지: {len(items)}건 수집")

    if not dry_run and items:
        save_items_to_db(items)

    # TODO: 페이지 이동 (추후 구현)
    # 현재는 첫 페이지만 수집

    return all_items


def run_geocode(limit: int = 100):
    """좌표 없는 물건에 대해 지오코딩 실행"""
    from db.queries import get_items_without_coords, update_coords
    from utils.geocoder import geocode_address

    items = get_items_without_coords(limit)
    logger.info(f"지오코딩 대상: {len(items)}건")
    success = 0
    for item in items:
        result = geocode_address(item["address_full"])
        if result:
            update_coords(item["id"], result[0], result[1])
            success += 1
    logger.info(f"지오코딩 완료: {success}/{len(items)}건")


def run_stats():
    """DB 통계 조회"""
    from db.queries import get_crawl_stats
    stats = get_crawl_stats()
    logger.info("=== DB 통계 ===")
    for k, v in stats.items():
        logger.info(f"  {k}: {v}")


def parse_args():
    parser = argparse.ArgumentParser(description="법원경매 크롤러")
    parser.add_argument("mode", nargs="?", default="crawl",
                        choices=["crawl", "geocode", "stats"],
                        help="실행 모드")
    parser.add_argument("--dry-run", action="store_true",
                        help="DB 저장 없이 JSON으로만 출력")
    parser.add_argument("--limit", type=int, default=1,
                        help="최대 페이지 수 (기본 1)")
    return parser.parse_args()


def main():
    args = parse_args()

    logger.info("=" * 50)
    logger.info(f"법원경매 크롤링 시작 (모드: {args.mode}, dry-run: {args.dry_run})")
    logger.info("=" * 50)

    if args.mode == "geocode":
        run_geocode(args.limit or 100)
        return
    if args.mode == "stats":
        run_stats()
        return

    # 크롤링
    with BrowserManager() as browser:
        page = browser.new_page()
        init_search_page(page)

        all_items = crawl(page, args.dry_run, args.limit)
        page.close()

    # JSON 저장 (항상)
    if all_items:
        save_json(all_items, "search")

    logger.info("=" * 50)
    logger.info(f"크롤링 완료: 총 {len(all_items)}건 수집")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
