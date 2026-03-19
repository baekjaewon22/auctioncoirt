"""법원경매 크롤러 메인 실행

courtauction.go.kr의 WebSquare 기반 검색 API를 활용하여
경매 물건 데이터를 수집합니다.

실행 흐름:
1. Playwright로 세션 초기화 (쿠키 획득)
2. 법원별 검색 API 호출 → 목록 수집
3. 신규/변경 물건에 대해 상세 API 호출
4. MySQL DB 저장
"""
import sys
from datetime import datetime, timedelta
from browser import BrowserManager, init_session, search_items, wait_between_requests
from parsers.list_parser import parse_search_result
from config import COURT_CODES, SIDO_CODES, MAX_PAGES, PAGE_SIZE
from utils.logger import setup_logger

logger = setup_logger()


def crawl_by_court(page, court_name: str, court_code: str):
    """특정 법원 기준으로 매각예정 물건 크롤링"""
    logger.info(f"[법원] {court_name} ({court_code}) 크롤링 시작")

    # 매각기일 범위: 오늘 ~ 60일 후
    today = datetime.now()
    date_from = today.strftime("%Y%m%d")
    date_to = (today + timedelta(days=60)).strftime("%Y%m%d")

    params = {
        "search_type": "1",  # 법원 기준 검색
        "court_code": court_code,
        "date_from": date_from,
        "date_to": date_to,
    }

    total_collected = 0

    for page_num in range(1, MAX_PAGES + 1):
        wait_between_requests()

        result = search_items(page, params, page_num)

        if "error" in result:
            logger.error(f"  API 오류: {result.get('error')}")
            break

        items, total_count = parse_search_result(result)

        if not items:
            logger.info(f"  페이지 {page_num}: 결과 없음, 종료")
            break

        total_collected += len(items)
        logger.info(
            f"  페이지 {page_num}: {len(items)}건 수집 "
            f"(누적 {total_collected}/{total_count})"
        )

        # TODO: DB 저장 로직
        # for item in items:
        #     item["court_id"] = get_or_create_court(court_code, court_name)
        #     upsert_auction_item(item)

        # 모든 결과를 수집했으면 종료
        if total_collected >= total_count:
            break

    logger.info(f"[법원] {court_name} 완료: 총 {total_collected}건")
    return total_collected


def crawl_by_region(page, sido_name: str, sido_code: str):
    """특정 시도 기준으로 매각예정 물건 크롤링"""
    logger.info(f"[지역] {sido_name} ({sido_code}) 크롤링 시작")

    today = datetime.now()
    date_from = today.strftime("%Y%m%d")
    date_to = (today + timedelta(days=60)).strftime("%Y%m%d")

    params = {
        "search_type": "2",  # 소재지 기준 검색
        "sido_code": sido_code,
        "date_from": date_from,
        "date_to": date_to,
    }

    total_collected = 0

    for page_num in range(1, MAX_PAGES + 1):
        wait_between_requests()

        result = search_items(page, params, page_num)

        if "error" in result:
            logger.error(f"  API 오류: {result.get('error')}")
            break

        items, total_count = parse_search_result(result)

        if not items:
            logger.info(f"  페이지 {page_num}: 결과 없음, 종료")
            break

        total_collected += len(items)
        logger.info(
            f"  페이지 {page_num}: {len(items)}건 수집 "
            f"(누적 {total_collected}/{total_count})"
        )

        if total_collected >= total_count:
            break

    logger.info(f"[지역] {sido_name} 완료: 총 {total_collected}건")
    return total_collected


def main():
    """전체 크롤링 실행"""
    mode = sys.argv[1] if len(sys.argv) > 1 else "court"

    logger.info("=" * 50)
    logger.info(f"법원경매 크롤링 시작 (모드: {mode})")
    logger.info("=" * 50)

    grand_total = 0

    with BrowserManager() as browser:
        page = browser.new_page()
        init_session(page)
        logger.info("세션 초기화 완료")

        if mode == "court":
            # 법원별 크롤링
            for court_name, court_code in COURT_CODES.items():
                count = crawl_by_court(page, court_name, court_code)
                grand_total += count
                wait_between_requests()

        elif mode == "region":
            # 지역별 크롤링
            for sido_name, sido_code in SIDO_CODES.items():
                count = crawl_by_region(page, sido_name, sido_code)
                grand_total += count
                wait_between_requests()

        else:
            logger.error(f"알 수 없는 모드: {mode}")
            logger.info("사용법: python main.py [court|region]")

        page.close()

    logger.info("=" * 50)
    logger.info(f"크롤링 완료: 총 {grand_total}건 수집")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
