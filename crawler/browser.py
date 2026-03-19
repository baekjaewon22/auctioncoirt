"""Playwright 브라우저 관리 + courtauction.go.kr 스크래핑

courtauction.go.kr은 WebSquare 프레임워크를 사용하며,
검색 결과는 UI 조작 후 HTML 스크래핑으로 수집합니다.

흐름:
1. PGJ151F00 (물건상세검색) 페이지 접속
2. 검색 조건 설정 (법원, 기간 등)
3. 검색 버튼 클릭
4. 결과 HTML 파싱
5. 페이지 이동하며 반복
"""
import time
from playwright.sync_api import sync_playwright, Browser, Page
from config import HEADLESS, CRAWL_DELAY, BASE_URL
from utils.logger import setup_logger

logger = setup_logger("browser")

SEARCH_PAGE = f"{BASE_URL}/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml"


class BrowserManager:
    """Playwright 브라우저 관리"""

    def __init__(self):
        self._playwright = None
        self._browser: Browser | None = None

    def start(self) -> Browser:
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        return self._browser

    def new_page(self) -> Page:
        if not self._browser:
            self.start()
        assert self._browser is not None
        context = self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="ko-KR",
        )
        return context.new_page()

    def close(self):
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def init_search_page(page: Page):
    """물건상세검색 페이지 로드 및 초기화"""
    logger.info("물건상세검색 페이지 접속 중...")
    page.goto(SEARCH_PAGE, wait_until="networkidle", timeout=30000)
    time.sleep(8)  # WebSquare 완전 초기화 대기
    logger.info("페이지 로드 완료")


def set_court(page: Page, court_code: str):
    """법원 선택"""
    try:
        page.evaluate(f"""() => {{
            var sbx = document.getElementById('mf_wfm_mainFrame_sbx_gdsDtlCortOfc');
            if (sbx) {{
                // WebSquare selectbox 값 설정
                sbx.value = '{court_code}';
                sbx.dispatchEvent(new Event('change', {{bubbles: true}}));
            }}
        }}""")
        time.sleep(1)
    except Exception as e:
        logger.warning(f"법원 선택 실패: {e}")


def click_search(page: Page):
    """검색 버튼 클릭 및 결과 대기"""
    try:
        page.click("#mf_wfm_mainFrame_btn_gdsDtlSrch")
        logger.info("검색 버튼 클릭")
        time.sleep(8)  # 결과 로딩 대기
    except Exception as e:
        logger.error(f"검색 버튼 클릭 실패: {e}")


def get_result_text(page: Page) -> str:
    """검색 결과 텍스트 추출"""
    try:
        text = page.evaluate("""() => {
            return document.body ? document.body.innerText : '';
        }""")
        return text
    except Exception as e:
        logger.error(f"결과 텍스트 추출 실패: {e}")
        return ""


def get_result_html(page: Page) -> str:
    """검색 결과 HTML 추출"""
    try:
        html = page.evaluate("""() => {
            return document.body ? document.body.innerHTML : '';
        }""")
        return html
    except Exception as e:
        logger.error(f"결과 HTML 추출 실패: {e}")
        return ""


def get_total_count(text: str) -> int:
    """결과 텍스트에서 총 건수 추출"""
    import re
    # "총 물건수201건" 또는 "총 201건" 패턴
    match = re.search(r'총\s*(?:물건수)?\s*(\d[\d,]*)\s*건', text)
    if match:
        return int(match.group(1).replace(",", ""))
    return 0


def click_next_page(page: Page, page_num: int) -> bool:
    """다음 페이지 클릭

    Returns:
        성공 여부
    """
    try:
        # 페이지 번호 링크 클릭
        clicked = page.evaluate(f"""() => {{
            var links = document.querySelectorAll('a, span, button');
            for (var link of links) {{
                var text = link.innerText.trim();
                if (text === '{page_num}') {{
                    link.click();
                    return true;
                }}
            }}
            // 다음 버튼 찾기
            var nextBtns = document.querySelectorAll('[id*=next], [id*=Next], [class*=next]');
            for (var btn of nextBtns) {{
                btn.click();
                return true;
            }}
            return false;
        }}""")

        if clicked:
            time.sleep(5)
            return True
        return False
    except Exception as e:
        logger.warning(f"페이지 {page_num} 이동 실패: {e}")
        return False


def wait_between_requests():
    """크롤링 부하 방지를 위한 대기"""
    time.sleep(CRAWL_DELAY)
