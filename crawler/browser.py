"""Playwright 브라우저 관리 + WebSquare API 호출"""
import json
import time
from playwright.sync_api import sync_playwright, Browser, Page
from config import HEADLESS, CRAWL_DELAY, BASE_URL, SEARCH_API_URL, PAGE_SIZE


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


def init_session(page: Page):
    """courtauction.go.kr 세션 초기화 (쿠키 획득)"""
    page.goto(f"{BASE_URL}/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ157M00.xml")
    page.wait_for_load_state("networkidle")
    # WebSquare가 초기화될 때까지 대기
    page.wait_for_timeout(2000)


def search_items(page: Page, params: dict, page_num: int = 1) -> dict:
    """WebSquare 검색 API 호출

    courtauction.go.kr의 검색은 POST 요청으로
    /pgj/pgjsearch/searchControllerMain.on 엔드포인트를 사용합니다.

    Args:
        page: Playwright Page (세션 쿠키 유지용)
        params: 검색 파라미터 (법원코드, 시도코드 등)
        page_num: 페이지 번호

    Returns:
        검색 결과 JSON
    """
    # WebSquare API는 특정 형식의 JSON을 기대함
    search_data = {
        "dma_srchGdsDtlSrchInfo": {
            "pgmId": "PGJ157M02",
            "bidDvsCd": "",  # 입찰구분 (빈값=전체)
            "statNum": str(page_num),
            "cortOfcCd": params.get("court_code", ""),
            "jdbnCd": params.get("dept_code", ""),
            "cortStDvs": params.get("search_type", "1"),  # 1=법원, 2=소재지
            "csNo": "",
            "aeeEvlAmtMin": params.get("price_min", ""),
            "aeeEvlAmtMax": params.get("price_max", ""),
            "rletLwsDspslPrcMin": params.get("bid_min", ""),
            "rletLwsDspslPrcMax": params.get("bid_max", ""),
            "rprsAdongSdCd": params.get("sido_code", ""),
            "rprsAdongSggCd": params.get("sigu_code", ""),
            "rprsAdongEmdCd": params.get("dong_code", ""),
            "lclDspslGdsLstUsgCd": params.get("type_large", ""),
            "mclDspslGdsLstUsgCd": params.get("type_medium", ""),
            "sclDspslGdsLstUsgCd": params.get("type_small", ""),
            "lwsDspslPrcRateMin": params.get("rate_min", ""),
            "lwsDspslPrcRateMax": params.get("rate_max", ""),
            "flbdNcntMin": params.get("fail_min", ""),
            "flbdNcntMax": params.get("fail_max", ""),
            "bidBgngYmd": params.get("date_from", ""),
            "bidEndYmd": params.get("date_to", ""),
            "pageSize": str(PAGE_SIZE),
        }
    }

    # Playwright의 evaluate를 통해 XHR 요청 실행
    result = page.evaluate("""
        async (data) => {
            const res = await fetch('%s', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return await res.text();
        }
    """ % SEARCH_API_URL, search_data)

    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"error": "JSON 파싱 실패", "raw": result[:500]}


def wait_between_requests():
    """크롤링 부하 방지를 위한 대기"""
    time.sleep(CRAWL_DELAY)
