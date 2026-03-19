"""법원경매 크롤러 메인 실행"""
from browser import BrowserManager, navigate_to_search, wait_between_requests
from parsers.list_parser import parse_item_list
from parsers.detail_parser import parse_item_detail
from config import COURT_CODES, MAX_PAGES
from utils.logger import setup_logger

logger = setup_logger()


def crawl_court(browser: BrowserManager, court_name: str, court_code: str):
    """특정 법원의 경매 물건 목록 크롤링"""
    logger.info(f"크롤링 시작: {court_name} ({court_code})")

    page = browser.new_page()
    try:
        frame = navigate_to_search(page)
        # TODO: 법원 선택, 검색 실행, 페이지 순회
        # 실제 구현 시 courtauction.go.kr의 현재 DOM 구조에 맞게 조정 필요
        logger.info(f"검색 페이지 로드 완료: {court_name}")

        for page_num in range(1, MAX_PAGES + 1):
            wait_between_requests()
            html = frame.content()
            items = parse_item_list(html)

            if not items:
                logger.info(f"  페이지 {page_num}: 물건 없음, 종료")
                break

            logger.info(f"  페이지 {page_num}: {len(items)}건 수집")
            # TODO: DB 저장
            # TODO: 다음 페이지 이동

    except Exception as e:
        logger.error(f"크롤링 오류 ({court_name}): {e}")
    finally:
        page.close()


def main():
    """전체 크롤링 실행"""
    logger.info("=== 법원경매 크롤링 시작 ===")

    with BrowserManager() as browser:
        for court_name, court_code in COURT_CODES.items():
            crawl_court(browser, court_name, court_code)
            wait_between_requests()

    logger.info("=== 크롤링 완료 ===")


if __name__ == "__main__":
    main()
