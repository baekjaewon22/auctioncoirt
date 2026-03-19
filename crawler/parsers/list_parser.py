"""경매 물건 목록 페이지 파싱"""
from bs4 import BeautifulSoup


def parse_item_list(html: str) -> list[dict]:
    """목록 페이지 HTML에서 물건 정보 추출"""
    soup = BeautifulSoup(html, "lxml")
    items = []

    rows = soup.select("table.Ltbl_list tbody tr")
    for row in rows:
        cols = row.select("td")
        if len(cols) < 7:
            continue

        item = {
            "case_no": _clean_text(cols[0]),
            "item_type": _clean_text(cols[1]),
            "address_full": _clean_text(cols[2]),
            "item_detail": _clean_text(cols[3]),
            "appraisal_price": _parse_price(cols[4]),
            "min_bid_price": _parse_price(cols[5]),
            "sale_date": _clean_text(cols[6]),
            "status": _clean_text(cols[7]) if len(cols) > 7 else None,
        }
        items.append(item)

    return items


def _clean_text(element) -> str:
    """HTML 요소에서 텍스트 추출 및 정리"""
    return element.get_text(strip=True) if element else ""


def _parse_price(element) -> int | None:
    """가격 문자열을 정수로 변환"""
    text = _clean_text(element).replace(",", "").replace("원", "")
    try:
        return int(text)
    except ValueError:
        return None
