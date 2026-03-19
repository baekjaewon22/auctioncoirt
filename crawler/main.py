"""법원경매 크롤러 메인 실행

사용법:
    python main.py [모드] [옵션]

모드:
    court     법원별 크롤링 (기본값)
    region    시도별 크롤링
    geocode   좌표 없는 물건 지오코딩
    stats     DB 통계 조회

옵션:
    --dry-run    DB 저장 없이 결과를 JSON으로 출력
    --limit N    최대 법원/지역 수 제한
    --court 법원명  특정 법원만 크롤링
    --sido 시도명   특정 시도만 크롤링
"""
import sys
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path

from browser import BrowserManager, init_session, search_items_api, wait_between_requests
from parsers.list_parser import parse_search_result
from config import COURT_CODES, SIDO_CODES, MAX_PAGES
from utils.logger import setup_logger

logger = setup_logger()

# 결과 저장 디렉토리
OUTPUT_DIR = Path(__file__).parent / "output"


def save_items(items: list[dict], court_id: int | None, dry_run: bool):
    """수집한 물건들을 DB 또는 JSON으로 저장"""
    if dry_run:
        return

    from db.queries import upsert_auction_item

    saved = 0
    for item in items:
        # DB 저장에 필요한 기본값 설정
        item.setdefault("court_id", court_id or 0)
        item.setdefault("item_no", 1)
        item.setdefault("land_area", None)
        item.setdefault("building_area", None)
        item.setdefault("floor_info", None)
        item.setdefault("bid_rate", None)
        item.setdefault("latitude", None)
        item.setdefault("longitude", None)
        item.setdefault("appraisal_pdf_url", None)
        item.setdefault("survey_pdf_url", None)
        item.setdefault("spec_pdf_url", None)

        try:
            upsert_auction_item(item)
            saved += 1
        except Exception as e:
            logger.error(f"  저장 실패 ({item.get('case_no')}): {e}")

    logger.info(f"  DB 저장: {saved}/{len(items)}건")


def save_json(all_items: list[dict], label: str):
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


def crawl_by_court(page, court_name: str, court_code: str, dry_run: bool) -> list[dict]:
    """특정 법원 기준으로 매각예정 물건 크롤링"""
    logger.info(f"[법원] {court_name} ({court_code}) 크롤링 시작")

    today = datetime.now()
    date_from = today.strftime("%Y%m%d")
    date_to = (today + timedelta(days=60)).strftime("%Y%m%d")

    params = {
        "search_type": "1",
        "court_code": court_code,
        "date_from": date_from,
        "date_to": date_to,
    }

    # 법원 ID (DB 모드일 때만)
    court_id = None
    if not dry_run:
        try:
            from db.queries import get_or_create_court
            court_id = get_or_create_court(court_code, court_name)
        except Exception as e:
            logger.warning(f"  법원 DB 등록 실패: {e}")

    all_items = []

    for page_num in range(1, MAX_PAGES + 1):
        wait_between_requests()

        result = search_items_api(page, params, page_num)

        if "error" in result:
            logger.error(f"  API 오류: {result.get('error')}")
            if result.get("raw"):
                logger.debug(f"  응답: {result['raw'][:200]}")
            break

        items, total_count = parse_search_result(result)

        if not items:
            if page_num == 1:
                logger.info(f"  결과 없음")
            else:
                logger.info(f"  페이지 {page_num}: 추가 결과 없음, 종료")
            break

        all_items.extend(items)
        logger.info(
            f"  페이지 {page_num}: {len(items)}건 "
            f"(누적 {len(all_items)}/{total_count})"
        )

        # DB 저장
        save_items(items, court_id, dry_run)

        if len(all_items) >= total_count:
            break

    logger.info(f"[법원] {court_name} 완료: {len(all_items)}건")
    return all_items


def crawl_by_region(page, sido_name: str, sido_code: str, dry_run: bool) -> list[dict]:
    """특정 시도 기준으로 매각예정 물건 크롤링"""
    logger.info(f"[지역] {sido_name} ({sido_code}) 크롤링 시작")

    today = datetime.now()
    date_from = today.strftime("%Y%m%d")
    date_to = (today + timedelta(days=60)).strftime("%Y%m%d")

    params = {
        "search_type": "2",
        "sido_code": sido_code,
        "date_from": date_from,
        "date_to": date_to,
    }

    all_items = []

    for page_num in range(1, MAX_PAGES + 1):
        wait_between_requests()

        result = search_items_api(page, params, page_num)

        if "error" in result:
            logger.error(f"  API 오류: {result.get('error')}")
            break

        items, total_count = parse_search_result(result)

        if not items:
            if page_num == 1:
                logger.info(f"  결과 없음")
            else:
                logger.info(f"  페이지 {page_num}: 추가 결과 없음, 종료")
            break

        all_items.extend(items)
        logger.info(
            f"  페이지 {page_num}: {len(items)}건 "
            f"(누적 {len(all_items)}/{total_count})"
        )

        save_items(items, None, dry_run)

        if len(all_items) >= total_count:
            break

    logger.info(f"[지역] {sido_name} 완료: {len(all_items)}건")
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
    parser.add_argument("mode", nargs="?", default="court",
                        choices=["court", "region", "geocode", "stats"],
                        help="크롤링 모드")
    parser.add_argument("--dry-run", action="store_true",
                        help="DB 저장 없이 JSON으로만 출력")
    parser.add_argument("--limit", type=int, default=0,
                        help="크롤링할 법원/지역 수 제한 (0=전체)")
    parser.add_argument("--court", type=str, default="",
                        help="특정 법원만 크롤링 (예: 서울중앙지방법원)")
    parser.add_argument("--sido", type=str, default="",
                        help="특정 시도만 크롤링 (예: 서울)")
    return parser.parse_args()


def main():
    args = parse_args()

    logger.info("=" * 50)
    logger.info(f"법원경매 크롤링 시작 (모드: {args.mode}, dry-run: {args.dry_run})")
    logger.info("=" * 50)

    # geocode/stats는 브라우저 불필요
    if args.mode == "geocode":
        run_geocode(args.limit or 100)
        return
    if args.mode == "stats":
        run_stats()
        return

    all_items = []

    with BrowserManager() as browser:
        page = browser.new_page()
        init_session(page)

        if args.mode == "court":
            targets = COURT_CODES.items()
            if args.court:
                targets = [(n, c) for n, c in targets if args.court in n]
            if args.limit:
                targets = list(targets)[:args.limit]

            for court_name, court_code in targets:
                items = crawl_by_court(page, court_name, court_code, args.dry_run)
                all_items.extend(items)
                wait_between_requests()

        elif args.mode == "region":
            targets = SIDO_CODES.items()
            if args.sido:
                targets = [(n, c) for n, c in targets if args.sido in n]
            if args.limit:
                targets = list(targets)[:args.limit]

            for sido_name, sido_code in targets:
                items = crawl_by_region(page, sido_name, sido_code, args.dry_run)
                all_items.extend(items)
                wait_between_requests()

        page.close()

    # 결과 JSON 저장 (항상)
    if all_items:
        save_json(all_items, args.mode)

    logger.info("=" * 50)
    logger.info(f"크롤링 완료: 총 {len(all_items)}건 수집")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
