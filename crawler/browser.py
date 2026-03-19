"""Playwright 브라우저 관리 + courtauction.go.kr API 호출

courtauction.go.kr은 WebSquare 프레임워크를 사용하며,
검색은 내부 JavaScript를 통해 POST 요청으로 처리됩니다.

두 가지 접근법을 지원합니다:
1. evaluate 방식: 브라우저 컨텍스트에서 fetch() 호출 (기본)
2. scrape 방식: 실제 UI를 조작하여 검색 실행 (fallback)
"""
import json
import time
from playwright.sync_api import sync_playwright, Browser, Page, Frame
from config import HEADLESS, CRAWL_DELAY, BASE_URL, SEARCH_API_URL, PAGE_SIZE
from utils.logger import setup_logger

logger = setup_logger("browser")


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


def init_session(page: Page) -> Frame | None:
    """courtauction.go.kr 세션 초기화

    Returns:
        메인 iframe Frame 또는 None
    """
    logger.info("세션 초기화: courtauction.go.kr 접속 중...")
    page.goto(
        f"{BASE_URL}/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ157M00.xml",
        wait_until="networkidle",
        timeout=30000,
    )
    # WebSquare 초기화 대기
    page.wait_for_timeout(3000)

    # iframe 확인
    frame = page.frame("indexFrame")
    if frame:
        logger.info("indexFrame 발견 - iframe 기반 구조")
    else:
        logger.info("indexFrame 없음 - 단일 페이지 구조")

    logger.info("세션 초기화 완료")
    return frame


def search_items_api(page: Page, params: dict, page_num: int = 1) -> dict:
    """WebSquare 검색 API를 브라우저 컨텍스트에서 호출

    Args:
        page: Playwright Page (세션 쿠키 유지)
        params: 검색 파라미터
        page_num: 페이지 번호

    Returns:
        API 응답 dict (파싱된 JSON 또는 에러)
    """
    search_data = _build_search_payload(params, page_num)

    try:
        result = page.evaluate("""
            async (payload) => {
                try {
                    const res = await fetch(payload.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json; charset=UTF-8',
                            'Accept': 'application/json, text/xml, */*',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        body: JSON.stringify(payload.data),
                    });
                    const text = await res.text();
                    return { status: res.status, body: text };
                } catch (e) {
                    return { status: 0, body: '', error: e.message };
                }
            }
        """, {"url": SEARCH_API_URL, "data": search_data})

        if result.get("error"):
            return {"error": f"fetch 오류: {result['error']}"}

        status = result.get("status", 0)
        body = result.get("body", "")

        if status != 200:
            logger.warning(f"API 응답 상태: {status}")
            return {"error": f"HTTP {status}", "raw": body[:300]}

        # JSON 파싱 시도
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            # WebSquare XML 응답일 수 있음
            if body.strip().startswith("<"):
                return _parse_xml_response(body)
            return {"error": "응답 파싱 실패", "raw": body[:500]}

    except Exception as e:
        logger.error(f"search_items_api 예외: {e}")
        return {"error": str(e)}


def search_items_scrape(page: Page, frame: Frame | None, params: dict) -> str:
    """UI 조작을 통한 검색 실행 (fallback 방식)

    WebSquare API 직접 호출이 안 될 경우 사용합니다.
    실제 검색 폼을 조작하여 결과를 가져옵니다.

    Returns:
        검색 결과 HTML
    """
    target = frame or page

    try:
        # 법원/소재지 선택
        search_type = params.get("search_type", "1")
        if search_type == "1":
            # 법원 기준 검색
            court_code = params.get("court_code", "")
            if court_code:
                target.evaluate(f"""
                    var sbx = WebSquare.getComponentById('sbx_dspslSchdGdsCortOfc');
                    if (sbx) sbx.setValue('{court_code}');
                """)
                time.sleep(0.5)
        else:
            # 소재지 기준 검색
            sido_code = params.get("sido_code", "")
            if sido_code:
                # 라디오 버튼 소재지 선택
                target.evaluate("""
                    var rad = WebSquare.getComponentById('rad_dspslSchdGdsSrchSt');
                    if (rad) rad.setValue('2');
                """)
                time.sleep(0.5)
                target.evaluate(f"""
                    var sbx = WebSquare.getComponentById('sbx_dspslSchdGdsAdongSdS');
                    if (sbx) sbx.setValue('{sido_code}');
                """)
                time.sleep(0.5)

        # 검색 버튼 클릭
        target.evaluate("""
            var btn = WebSquare.getComponentById('btn_dspslSchdGdsSrch');
            if (btn) btn.click();
        """)

        # 결과 로딩 대기
        time.sleep(3)

        # 결과 페이지의 HTML 가져오기
        html = target.content()
        return html

    except Exception as e:
        logger.error(f"scrape 방식 검색 실패: {e}")
        return ""


def _build_search_payload(params: dict, page_num: int) -> dict:
    """WebSquare 검색 요청 페이로드 생성"""
    return {
        "dma_srchGdsDtlSrchInfo": {
            "pgmId": "PGJ157M02",
            "bidDvsCd": "",
            "statNum": str(page_num),
            "cortOfcCd": params.get("court_code", ""),
            "jdbnCd": params.get("dept_code", ""),
            "cortStDvs": params.get("search_type", "1"),
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
            "objctArDtsMin": "",
            "objctArDtsMax": "",
            "bidBgngYmd": params.get("date_from", ""),
            "bidEndYmd": params.get("date_to", ""),
            "pageSize": str(PAGE_SIZE),
        }
    }


def _parse_xml_response(xml_text: str) -> dict:
    """WebSquare XML 응답을 dict로 변환"""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(xml_text, "lxml-xml")

        result = {}
        # w2:dataList 추출
        for data_list in soup.find_all("w2:dataList") or soup.find_all("dataList"):
            list_id = data_list.get("id", "unknown")
            rows = []
            for row in data_list.find_all("w2:row") or data_list.find_all("row"):
                row_data = {}
                for col in row.find_all("w2:column") or row.find_all("column"):
                    col_id = col.get("id", "")
                    row_data[col_id] = col.get_text(strip=True)
                rows.append(row_data)
            result[list_id] = rows

        # w2:dataMap 추출
        for data_map in soup.find_all("w2:dataMap") or soup.find_all("dataMap"):
            map_id = data_map.get("id", "unknown")
            map_data = {}
            for col in data_map.find_all("w2:column") or data_map.find_all("column"):
                col_id = col.get("id", "")
                map_data[col_id] = col.get_text(strip=True)
            result[map_id] = map_data

        return result
    except Exception as e:
        logger.error(f"XML 파싱 오류: {e}")
        return {"error": f"XML 파싱 실패: {e}", "raw": xml_text[:500]}


def wait_between_requests():
    """크롤링 부하 방지를 위한 대기"""
    time.sleep(CRAWL_DELAY)
