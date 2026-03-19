"""마이옥션 관심물건 전체 크롤링

마이페이지 → 나의 관심물건 → 각 물건 상세 + 이미지 전부 추출

사용법:
    python crawl_favorites.py
    python crawl_favorites.py --dry-run
"""
# -*- coding: utf-8 -*-
import json
import time
import re
import os
import argparse
import requests
from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

OUTPUT_DIR = Path(__file__).parent / "output"
IMAGE_DIR = OUTPUT_DIR / "images"

LOGIN_URL = "http://www.my-auction.co.kr/member/login.php"
MYPAGE_URL = "http://www.my-auction.co.kr/mypage/mypage.php"
FAVORITES_URL = "http://www.my-auction.co.kr/mypage/my_list.php"
BASE_URL = "http://www.my-auction.co.kr"

USER_ID = "xmcnvb7432"
USER_PW = "1230"


def login(page):
    """마이옥션 로그인"""
    page.goto(LOGIN_URL, timeout=60000)
    page.wait_for_load_state("domcontentloaded")
    time.sleep(2)
    page.fill("#id", USER_ID)
    page.fill("#passwd", USER_PW)
    page.click("#btn_login")
    time.sleep(4)
    print(f"[로그인] {page.url}")


def get_favorite_links(page) -> list[dict]:
    """관심물건 목록에서 물건 링크 추출"""
    page.goto(FAVORITES_URL, timeout=60000)
    page.wait_for_load_state("domcontentloaded")
    time.sleep(3)

    html = page.content()
    soup = BeautifulSoup(html, "lxml")
    table = soup.select_one(".tbl_auction_list")
    if not table:
        print("[경고] 관심물건 테이블을 찾을 수 없음")
        return []

    items = []
    seen_ids = set()
    for row in table.select("tr"):
        tds = row.select("td")
        if len(tds) < 7:
            continue

        # 실제 물건 링크에서 ID 추출 (/view/1367800)
        link = row.select_one("a[href*='/view/']")
        if not link:
            continue

        href = link.get("href", "")
        id_match = re.search(r"/view/(\d+)", href)
        if not id_match:
            continue

        item_id = id_match.group(1)
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)

        items.append({
            "id": item_id,
            "url": f"{BASE_URL}/view/{item_id}",
            "address_preview": link.text.strip()[:80] if link else "",
        })

    print(f"[관심물건] {len(items)}건 발견")
    return items


def crawl_detail(page, item_url: str, item_id: str) -> dict:
    """물건 상세 페이지에서 모든 데이터 + 이미지 추출"""
    page.goto(item_url, timeout=60000)
    page.wait_for_load_state("domcontentloaded")
    time.sleep(3)

    html = page.content()
    soup = BeautifulSoup(html, "lxml")
    text = page.evaluate("() => document.body.innerText")

    detail = {
        "id": item_id,
        "detail_url": item_url,
        "crawled_at": datetime.now().isoformat(),
    }

    # ===== 1. 이미지 전체 추출 =====
    images = []
    for img in soup.select("img"):
        src = img.get("src", "")
        if any(k in src for k in ["nuriauction", "courtauction", "photo", "pic_", "/data/"]):
            if src not in images:
                images.append(src)
    detail["images"] = images

    # ===== 2. 사건기본정보 테이블 =====
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
    detail["경매종류"] = info.get("경매종류", "")
    detail["물건종류"] = info.get("물건종류", "")
    detail["경매대상"] = info.get("경매대상", "")
    detail["입찰방법"] = info.get("입찰방법", "")
    detail["채무소유자"] = info.get("채무/소유자", "")
    detail["채권자"] = info.get("채권자", "")
    detail["관련사건"] = info.get("관련사건", "")

    # 면적 (㎡ → 평 변환)
    토지면적_raw = info.get("토지면적", "")
    건물면적_raw = info.get("건물면적", "")
    detail["토지면적_raw"] = 토지면적_raw
    detail["건물면적_raw"] = 건물면적_raw
    detail["토지면적_sqm"] = _extract_sqm(토지면적_raw)
    detail["건물면적_sqm"] = _extract_sqm(건물면적_raw)
    detail["토지면적_pyeong"] = _extract_pyeong(토지면적_raw)
    detail["건물면적_pyeong"] = _extract_pyeong(건물면적_raw)

    # 가격
    감정가_raw = info.get("감정가", "")
    최저가_raw = info.get("최저가", "")
    detail["감정가"] = _extract_number(감정가_raw)
    detail["최저가"] = _extract_number(최저가_raw)

    입찰보증금_raw = info.get("입찰보증금", "")
    detail["입찰보증금"] = _extract_number(입찰보증금_raw)
    detail["청구금액"] = _extract_number(info.get("청구금액", ""))

    # 매각기일
    date_m = re.search(r"본 사건의 매각기일은\s*(\d{4}-\d{2}-\d{2})", text)
    detail["매각기일"] = date_m.group(1) if date_m else ""

    # 진행상태
    status_m = re.search(r"(신건|유찰\s*\d+\s*회|재진행\s*\d+\s*회|매각|취하|변경)", text[:500])
    detail["진행상태"] = status_m.group(1) if status_m else ""

    # 매각가율
    rate_m = re.search(r"[↓↑]?\s*(\d+)%", text[:500])
    detail["매각가율"] = int(rate_m.group(1)) if rate_m else None

    # 조회수
    views_m = re.search(r"조회수[:\s]*(\d[\d,]*)", text)
    detail["조회수"] = int(views_m.group(1).replace(",", "")) if views_m else 0

    # ===== 3. 감정평가 현황 =====
    appraisal_text = ""
    if "감정평가현황" in text:
        idx = text.index("감정평가현황")
        appraisal_text = text[idx:idx + 2000]
    detail["감정평가현황"] = appraisal_text

    # 감정원/가격시점
    appraiser_m = re.search(r"감정원\s*[:：]\s*([^\s/]+)", appraisal_text)
    date_point_m = re.search(r"가격시점\s*[:：]\s*([\d.]+)", appraisal_text)
    detail["감정원"] = appraiser_m.group(1) if appraiser_m else ""
    detail["가격시점"] = date_point_m.group(1) if date_point_m else ""

    # ===== 4. 기일내역 (매각 히스토리) =====
    history = []
    history_pattern = re.compile(
        r"(\d{4}[.-]\d{2}[.-]\d{2})\s+.*?(\d[\d,]+)\s*원.*?(\d[\d,]+)\s*원.*?(유찰|매각|변경|취하)",
        re.DOTALL,
    )
    # 테이블에서 추출
    for table in soup.select("table"):
        headers = [th.get_text(strip=True) for th in table.select("th")]
        if any("기일" in h for h in headers) and any("최저" in h or "결과" in h for h in headers):
            for row in table.select("tr"):
                cells = [td.get_text(strip=True) for td in row.select("td")]
                if len(cells) >= 3:
                    history.append(cells)
    detail["기일내역"] = history

    # ===== 5. 특수권리 =====
    special_rights = []
    for span in soup.select(".refer a, .refer span"):
        t = span.get_text(strip=True)
        if t and t not in special_rights:
            special_rights.append(t)
    detail["특수권리"] = special_rights

    # ===== 6. 문서 링크 =====
    documents = {}
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        atext = a.get_text(strip=True)
        if "pop_detail" in href:
            doc_type_m = re.search(r"pop_detail\('(\w+)'", href)
            if doc_type_m:
                doc_type = doc_type_m.group(1)
                documents[atext] = {
                    "type": doc_type,
                    "js": href,
                    "url": f"{BASE_URL}/auction/popup/{doc_type}.php?idx={item_id}",
                }
    detail["문서링크"] = documents

    # ===== 7. 주소 분리 =====
    address = detail["소재지"]
    parts = address.split()
    detail["시도"] = parts[0] if parts else ""
    detail["시군구"] = parts[1] if len(parts) > 1 else ""
    detail["읍면동"] = parts[2] if len(parts) > 2 else ""
    detail["주소전체"] = address

    print(f"  [상세] {detail['물건종류']} | {address[:40]} | 감정가 {detail['감정가']} | 이미지 {len(images)}개")
    return detail


def download_images(item_id: str, image_urls: list[str]) -> list[str]:
    """이미지 다운로드"""
    item_dir = IMAGE_DIR / item_id
    item_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    for i, url in enumerate(image_urls):
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                ext = "jpg"
                filepath = item_dir / f"{i:02d}.{ext}"
                filepath.write_bytes(resp.content)
                saved.append(str(filepath))
        except Exception as e:
            print(f"  [이미지] 다운로드 실패: {url[:60]}... ({e})")

    print(f"  [이미지] {len(saved)}/{len(image_urls)}개 저장 → {item_dir}")
    return saved


def main():
    parser = argparse.ArgumentParser(description="마이옥션 관심물건 크롤러")
    parser.add_argument("--dry-run", action="store_true", help="DB 저장 없이 JSON만 출력")
    parser.add_argument("--no-images", action="store_true", help="이미지 다운로드 생략")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    IMAGE_DIR.mkdir(exist_ok=True)

    print("=" * 60)
    print(f"마이옥션 관심물건 크롤링 시작 ({datetime.now().isoformat()})")
    print("=" * 60)

    all_items = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # 로그인
        login(page)

        # 관심물건 목록
        favorites = get_favorite_links(page)

        # 각 물건 상세 크롤링
        for i, fav in enumerate(favorites):
            print(f"\n[{i + 1}/{len(favorites)}] {fav['url']}")
            try:
                detail = crawl_detail(page, fav["url"], fav["id"])

                # 이미지 다운로드
                if not args.no_images and detail.get("images"):
                    local_images = download_images(fav["id"], detail["images"])
                    detail["local_images"] = local_images

                all_items.append(detail)
                time.sleep(2)  # 부하 방지
            except Exception as e:
                print(f"  [오류] {e}")

        page.close()
        browser.close()

    # JSON 저장
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = OUTPUT_DIR / f"favorites_{timestamp}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "crawled_at": datetime.now().isoformat(),
                "source": "my-auction.co.kr",
                "count": len(all_items),
                "items": all_items,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"\n{'=' * 60}")
    print(f"크롤링 완료: {len(all_items)}건")
    print(f"JSON: {output_file}")
    print(f"이미지: {IMAGE_DIR}")
    print(f"{'=' * 60}")


def _extract_number(text: str) -> int | None:
    """텍스트에서 숫자 추출"""
    nums = re.findall(r"(\d[\d,]+)", text)
    if nums:
        return int(nums[0].replace(",", ""))
    return None


def _extract_sqm(text: str) -> float | None:
    """면적 텍스트에서 ㎡ 추출"""
    m = re.search(r"([\d,.]+)\s*㎡", text)
    return float(m.group(1).replace(",", "")) if m else None


def _extract_pyeong(text: str) -> float | None:
    """면적 텍스트에서 평 추출"""
    m = re.search(r"([\d,.]+)\s*평", text)
    return float(m.group(1).replace(",", "")) if m else None


if __name__ == "__main__":
    main()
