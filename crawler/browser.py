import time
from playwright.sync_api import sync_playwright, Browser, Page
from config import HEADLESS, CRAWL_DELAY, BASE_URL


class BrowserManager:
    """Playwright 브라우저 관리"""

    def __init__(self):
        self._playwright = None
        self._browser: Browser | None = None

    def start(self) -> Browser:
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=HEADLESS)
        return self._browser

    def new_page(self) -> Page:
        if not self._browser:
            self.start()
        assert self._browser is not None
        page = self._browser.new_page()
        page.set_extra_http_headers({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            )
        })
        return page

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


def navigate_to_search(page: Page):
    """경매 검색 페이지로 이동"""
    page.goto(f"{BASE_URL}/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ157M00.xml")
    page.wait_for_load_state("networkidle")
    # courtauction.go.kr은 iframe 기반 구조
    frame = page.frame("indexFrame")
    if frame is None:
        raise RuntimeError("indexFrame을 찾을 수 없습니다")
    return frame


def wait_between_requests():
    """크롤링 부하 방지를 위한 대기"""
    time.sleep(CRAWL_DELAY)
