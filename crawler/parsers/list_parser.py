"""검색 결과 JSON 파싱 (WebSquare API 응답)"""
import re
from utils.logger import setup_logger

logger = setup_logger("list_parser")


def parse_search_result(data: dict) -> tuple[list[dict], int]:
    """WebSquare 검색 API 응답에서 물건 목록 추출

    Args:
        data: API 응답 JSON

    Returns:
        (물건 목록, 총 건수) 튜플
    """
    items = []
    total_count = 0

    # WebSquare 응답 구조: dlt_srchResult 데이터리스트에 결과가 담김
    result_list = data.get("dlt_srchResult", [])
    if isinstance(result_list, dict):
        result_list = result_list.get("rows", [])

    # 총 건수 추출
    page_info = data.get("dma_pageInfo", {})
    total_count = _safe_int(page_info.get("totalCnt", "0"))

    for row in result_list:
        item = _parse_row(row)
        if item:
            items.append(item)

    logger.info(f"파싱 완료: {len(items)}건 / 총 {total_count}건")
    return items, total_count


def _parse_row(row: dict) -> dict | None:
    """개별 행 데이터 파싱"""
    case_no = row.get("srnSaNo", "").strip()
    if not case_no:
        return None

    # 사건번호에서 연도/타경/번호 추출
    # 예: "2024타경12345" 형태
    item = {
        "case_no": case_no,
        "item_no": _safe_int(row.get("maemulSer", "1")) or 1,
        "court_code": row.get("cortOfcCd", ""),
        "court_name": row.get("cortOfcNm", ""),
        "dept_name": row.get("jpDeptNm", ""),

        # 소재지
        "address_full": row.get("rprsAdong", "").strip(),
        "sido": row.get("rprsAdongSdNm", ""),
        "sigu": row.get("rprsAdongSggNm", ""),
        "dong": row.get("rprsAdongEmdNm", ""),

        # 물건 정보
        "item_type": row.get("dspslGdsLstUsgNm", ""),
        "item_detail": row.get("boCd", "").strip(),

        # 가격
        "appraisal_price": _safe_int(row.get("gamevalAmt")),
        "min_bid_price": _safe_int(row.get("lwsDspslPrc")),
        "bid_rate": _safe_float(row.get("lwsDspslPrcRate")),

        # 일정
        "sale_date": _format_date(row.get("dspslDxdyYmd", "")),
        "sale_time": row.get("dspslDxdyTm", ""),

        # 진행상태
        "fail_count": _safe_int(row.get("yuchalCnt", "0")),
        "status": _determine_status(row),

        # 기타
        "print_st": row.get("printSt", ""),
    }

    return item


def _determine_status(row: dict) -> str:
    """진행상태 판별"""
    fail_count = _safe_int(row.get("yuchalCnt", "0"))
    print_st = row.get("printSt", "")

    if "취하" in print_st:
        return "취하"
    if "낙찰" in print_st:
        return "낙찰"
    if fail_count and fail_count > 0:
        return f"유찰{fail_count}회"
    return "신건"


def _format_date(date_str: str) -> str:
    """날짜 형식 변환 (20260319 → 2026-03-19)"""
    date_str = date_str.strip()
    if len(date_str) == 8 and date_str.isdigit():
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    return date_str


def _safe_int(value) -> int | None:
    """안전한 정수 변환"""
    if value is None:
        return None
    try:
        cleaned = str(value).replace(",", "").replace("원", "").strip()
        return int(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


def _safe_float(value) -> float | None:
    """안전한 실수 변환"""
    if value is None:
        return None
    try:
        cleaned = str(value).replace("%", "").strip()
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None
