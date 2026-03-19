"""크롤링 API 서버

웹사이트에서 '마이옥션 관심물건 가져오기' 버튼을 클릭하면
이 서버가 크롤링을 실행하고 결과를 D1에 업로드합니다.

실행: python server.py
포트: 8787
"""
# -*- coding: utf-8 -*-
import json
import re
import subprocess
import time
import os
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

PORT = 8787
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = Path(__file__).parent / "output"


class CrawlHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self._cors_headers()
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/crawl":
            self._handle_crawl()
        else:
            self._json_response(404, {"error": "Not found"})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/crawl/status":
            self._json_response(200, {"status": "ready"})
        else:
            self._json_response(404, {"error": "Not found"})

    def _handle_crawl(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length > 0 else {}
        except Exception:
            body = {}

        myauction_id = body.get("myauction_id", "")
        myauction_pw = body.get("myauction_pw", "")
        user_id = body.get("user_id", 0)

        if not myauction_id or not myauction_pw:
            self._json_response(400, {"error": "마이옥션 아이디/비밀번호를 입력해주세요"})
            return

        print(f"[크롤링 시작] user={user_id} myauction={myauction_id}")

        try:
            items = crawl_favorites(myauction_id, myauction_pw)
            print(f"[크롤링 완료] {len(items)}건")

            # D1 업로드
            if items:
                sql = generate_d1_sql(items, user_id)
                upload_to_d1(sql)
                print(f"[D1 업로드 완료]")

            self._json_response(200, {
                "data": {
                    "count": len(items),
                    "items": [
                        {
                            "case_no": it.get("사건번호", ""),
                            "item_type": it.get("물건종류", ""),
                            "address": it.get("주소전체", ""),
                        }
                        for it in items
                    ],
                }
            })
        except Exception as e:
            print(f"[크롤링 오류] {e}")
            self._json_response(500, {"error": str(e)})

    def _json_response(self, status, data):
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")


def crawl_favorites(myauction_id: str, myauction_pw: str) -> list[dict]:
    """마이옥션 관심물건 크롤링"""
    items = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # 로그인
        page.goto("http://www.my-auction.co.kr/member/login.php", timeout=60000)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(2)
        page.fill("#id", myauction_id)
        page.fill("#passwd", myauction_pw)
        page.click("#btn_login")
        time.sleep(4)

        # 관심물건 페이지
        page.goto("http://www.my-auction.co.kr/mypage/my_list.php", timeout=60000)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(3)

        html = page.content()
        soup = BeautifulSoup(html, "lxml")
        table = soup.select_one(".tbl_auction_list")
        if not table:
            browser.close()
            return []

        # 물건 링크 추출
        seen = set()
        fav_links = []
        for link in table.select("a[href*='/view/']"):
            m = re.search(r"/view/(\d+)", link.get("href", ""))
            if m and m.group(1) not in seen:
                seen.add(m.group(1))
                fav_links.append(m.group(1))

        print(f"  관심물건 {len(fav_links)}건 발견")

        # 각 물건 상세 크롤링
        for i, item_id in enumerate(fav_links):
            print(f"  [{i+1}/{len(fav_links)}] /view/{item_id}")
            try:
                page.goto(f"http://www.my-auction.co.kr/view/{item_id}", timeout=60000)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

                detail = extract_detail(page, item_id)
                items.append(detail)
                time.sleep(5)
            except Exception as e:
                print(f"  오류: {e}")

        page.close()
        browser.close()

    return items


def extract_detail(page, item_id: str) -> dict:
    """상세 페이지 파싱 (간소화)"""
    html = page.content()
    soup = BeautifulSoup(html, "lxml")
    text = page.evaluate("() => document.body.innerText")

    detail = {"id": item_id}

    # 헤더에서 법원/사건번호
    header_m = re.search(r"([가-힣]+(?:지방법원|지원|본원)?)\s*(?:경매\d+계)?\s*(\d{4})\s*타경\s*(\d+)", text[:300])
    if header_m:
        detail["법원명"] = header_m.group(1).strip()
        detail["사건번호"] = f"{header_m.group(2)}타경{header_m.group(3)}"
    else:
        detail["법원명"] = ""
        detail["사건번호"] = item_id

    # 테이블 key-value
    info = {}
    for table in soup.select("table"):
        for row in table.select("tr"):
            cells = row.select("th, td")
            i = 0
            while i < len(cells) - 1:
                label = cells[i].get_text(strip=True)
                value = cells[i + 1].get_text(strip=True)
                if label and value and 1 < len(label) < 25 and len(value) < 500:
                    info[label] = value
                i += 2

    detail["소재지"] = info.get("소재지", "")
    detail["물건종류"] = info.get("물건종류", "")
    detail["경매종류"] = info.get("경매종류", "")
    detail["경매대상"] = info.get("경매대상", "")
    detail["입찰방법"] = info.get("입찰방법", "")
    detail["채무소유자"] = info.get("채무/소유자", "")
    detail["채권자"] = info.get("채권자", "")
    detail["관련사건"] = info.get("관련사건", "")
    detail["토지면적_pyeong"] = _extract_pyeong(info.get("토지면적", ""))
    detail["건물면적_pyeong"] = _extract_pyeong(info.get("건물면적", ""))

    # 감정평가현황 전체 텍스트
    if "감정평가현황" in text:
        idx = text.index("감정평가현황")
        detail["감정평가현황"] = text[idx:idx+3000]
    else:
        detail["감정평가현황"] = ""

    # 감정가 (합산)
    ap_text = detail["감정평가현황"]
    prices = re.findall(r"(\d[\d,]+)원\n[\d,]+원\(㎡\)", ap_text)
    detail["감정가"] = sum(int(p.replace(",", "")) for p in prices) if prices else None

    # 최저가/매각가율
    rate_m = re.search(r"[↓↑]?\s*(\d+)%", text[:500])
    detail["매각가율"] = int(rate_m.group(1)) if rate_m else None
    if detail["감정가"] and detail["매각가율"]:
        detail["최저가"] = int(detail["감정가"] * detail["매각가율"] / 100)
    else:
        detail["최저가"] = None

    # 상태/기일/조회수
    status_m = re.search(r"(신건|유찰\s*\d+\s*회|재진행\s*\d+\s*회|매각|취하|변경)", text[:500])
    detail["진행상태"] = status_m.group(1) if status_m else ""

    date_m = re.search(r"매각기일은\s*(\d{4}-\d{2}-\d{2})", text)
    detail["매각기일"] = date_m.group(1) if date_m else ""

    views_m = re.search(r"조회수[:\s]*(\d[\d,]*)", text)
    detail["조회수"] = int(views_m.group(1).replace(",", "")) if views_m else 0

    # 이미지 (본 물건만)
    case_num = re.search(r"(\d+)$", detail["사건번호"])
    case_num = case_num.group(1) if case_num else ""
    images = []
    for img in soup.select("img"):
        src = img.get("src", "")
        if case_num and case_num in src and "nuriauction" in src:
            if src not in images:
                images.append(src)
    detail["images"] = images[:5]

    # 문서링크
    documents = {}
    for a in soup.select("a[href*=pop_detail]"):
        href = a.get("href", "")
        atext = a.get_text(strip=True)
        doc_m = re.search(r"pop_detail\('(\w+)'", href)
        if doc_m:
            documents[atext] = {
                "type": doc_m.group(1),
                "url": f"http://www.my-auction.co.kr/auction/popup/{doc_m.group(1)}.php?idx={item_id}",
            }
    detail["문서링크"] = documents

    # 섹션 분리
    section_titles = ["감정평가현황", "국토부 실거래가", "임차인현황", "건물 등기부현황", "예상배당표", "주의사항"]
    sections = {}
    full = detail["감정평가현황"]
    for title in section_titles:
        idx = full.find(title)
        if idx < 0:
            continue
        next_idx = len(full)
        for nt in section_titles:
            if nt == title:
                continue
            ni = full.find(nt, idx + len(title))
            if ni > idx and ni < next_idx:
                next_idx = ni
        sections[title] = full[idx:next_idx].strip()
    detail["sections"] = sections

    # 주소 분리
    addr = detail["소재지"]
    parts = addr.split()
    detail["시도"] = parts[0] if parts else ""
    detail["시군구"] = parts[1] if len(parts) > 1 else ""
    detail["읍면동"] = parts[2] if len(parts) > 2 else ""
    detail["주소전체"] = addr

    return detail


def generate_d1_sql(items: list[dict], user_id: int) -> str:
    """D1 INSERT SQL 생성"""
    lines = []

    courts = {}
    for item in items:
        cn = item.get("법원명", "미확인")
        if cn not in courts:
            courts[cn] = len(courts) + 1

    for name, cid in courts.items():
        n = name.replace("'", "''")
        lines.append(f"INSERT OR IGNORE INTO courts (id, court_code, court_name) VALUES ({cid}, '{n}', '{n}');")

    for item in items:
        def e(v):
            if v is None or v == "":
                return "NULL"
            s = str(v).replace("'", "''").replace("\r", "")
            return f"'{s[:5000]}'"
        def n(v):
            return str(v) if v is not None else "NULL"

        court_id = courts.get(item.get("법원명", "미확인"), 1)
        secs = item.get("sections", {})

        lines.append(
            f"INSERT OR REPLACE INTO auction_items ("
            f"case_no, item_no, court_id, user_id, address_full, sido, sigu, dong, "
            f"item_type, land_area, building_area, "
            f"appraisal_price, min_bid_price, bid_rate, sale_date, "
            f"status, fail_count, image_url, detail_url, views, "
            f"auction_type, auction_target, bid_method, "
            f"debtor, creditor, related_case, appraiser, "
            f"appraisal_summary, tenant_info, registry_info, expected_dividend, "
            f"real_trade_info, caution_notes, documents, all_images, source_url"
            f") VALUES ("
            f"{e(item.get('사건번호'))}, 1, {court_id}, {user_id}, "
            f"{e(item.get('주소전체'))}, {e(item.get('시도'))}, {e(item.get('시군구'))}, {e(item.get('읍면동'))}, "
            f"{e(item.get('물건종류'))}, {n(item.get('토지면적_pyeong'))}, {n(item.get('건물면적_pyeong'))}, "
            f"{n(item.get('감정가'))}, {n(item.get('최저가'))}, {n(item.get('매각가율'))}, "
            f"{e(item.get('매각기일'))}, "
            f"{e(item.get('진행상태'))}, 0, "
            f"{e(item.get('images', [''])[0] if item.get('images') else '')}, "
            f"{e(f'http://www.my-auction.co.kr/view/{item[\"id\"]}')}, {n(item.get('조회수', 0))}, "
            f"{e(item.get('경매종류'))}, {e(item.get('경매대상'))}, {e(item.get('입찰방법'))}, "
            f"{e(item.get('채무소유자'))}, {e(item.get('채권자'))}, {e(item.get('관련사건'))}, "
            f"{e(item.get('감정원', ''))}, "
            f"{e(secs.get('감정평가현황', ''))}, "
            f"{e(secs.get('임차인현황', ''))}, "
            f"{e(secs.get('건물 등기부현황', ''))}, "
            f"{e(secs.get('예상배당표', ''))}, "
            f"{e(secs.get('국토부 실거래가', ''))}, "
            f"{e(secs.get('주의사항', ''))}, "
            f"{e(json.dumps(item.get('문서링크', {}), ensure_ascii=False))}, "
            f"{e(json.dumps(item.get('images', []), ensure_ascii=False))}, "
            f"{e(f'http://www.my-auction.co.kr/view/{item[\"id\"]}')}"
            f");"
        )

    return "\n".join(lines)


def upload_to_d1(sql: str):
    """wrangler로 D1에 SQL 실행"""
    sql_path = OUTPUT_DIR / "auto_upload.sql"
    sql_path.write_text(sql, encoding="utf-8")

    for target in ["--local", "--remote"]:
        try:
            subprocess.run(
                ["npx", "wrangler", "d1", "execute", "auctioncourt-db", target, f"--file={sql_path}"],
                capture_output=True, text=True, timeout=30,
                cwd=str(PROJECT_ROOT), encoding="utf-8",
            )
        except Exception as e:
            print(f"  D1 {target} 업로드 오류: {e}")


def _extract_pyeong(text: str):
    m = re.search(r"([\d,.]+)\s*평", str(text))
    return float(m.group(1).replace(",", "")) if m else None


if __name__ == "__main__":
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"크롤링 API 서버 시작: http://localhost:{PORT}")
    print("웹사이트에서 '마이옥션 관심물건 가져오기' 버튼을 클릭하세요")
    server = HTTPServer(("0.0.0.0", PORT), CrawlHandler)
    server.serve_forever()
