"""경매 물건 상세 페이지 파싱"""
from bs4 import BeautifulSoup


def parse_item_detail(html: str) -> dict:
    """상세 페이지 HTML에서 물건 상세정보 추출"""
    soup = BeautifulSoup(html, "lxml")

    detail = {
        "building_area": None,
        "land_area": None,
        "floor_info": None,
        "item_detail": None,
        "tenants": [],
        "sale_history": [],
        "appraisal_pdf_url": None,
        "survey_pdf_url": None,
        "spec_pdf_url": None,
    }

    # 건물/토지 내역 파싱
    building_table = soup.select_one("table.Ltbl_dt")
    if building_table:
        rows = building_table.select("tr")
        for row in rows:
            th = row.select_one("th")
            td = row.select_one("td")
            if not th or not td:
                continue
            label = th.get_text(strip=True)
            value = td.get_text(strip=True)

            if "건물면적" in label:
                detail["building_area"] = _parse_area(value)
            elif "토지면적" in label:
                detail["land_area"] = _parse_area(value)
            elif "층" in label:
                detail["floor_info"] = value

    # 임차인 현황
    tenant_table = soup.select("table.Ltbl_list")
    for table in tenant_table:
        caption = table.select_one("caption")
        if caption and "임차인" in caption.get_text():
            for row in table.select("tbody tr"):
                cols = row.select("td")
                if len(cols) >= 3:
                    detail["tenants"].append({
                        "tenant_type": cols[0].get_text(strip=True),
                        "deposit": _parse_price(cols[1].get_text(strip=True)),
                        "move_in_date": cols[2].get_text(strip=True),
                    })

    # PDF 링크
    for link in soup.select("a[href]"):
        href = link.get("href", "")
        text = link.get_text(strip=True)
        if isinstance(href, list):
            href = href[0]
        if "감정" in text:
            detail["appraisal_pdf_url"] = href
        elif "현황조사" in text:
            detail["survey_pdf_url"] = href
        elif "매각물건명세" in text:
            detail["spec_pdf_url"] = href

    return detail


def _parse_area(text: str) -> float | None:
    """면적 문자열을 float으로 변환"""
    cleaned = text.replace("㎡", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_price(text: str) -> int | None:
    """가격 문자열을 정수로 변환"""
    cleaned = text.replace(",", "").replace("원", "").strip()
    try:
        return int(cleaned)
    except ValueError:
        return None
