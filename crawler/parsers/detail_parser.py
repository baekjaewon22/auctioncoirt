"""경매 물건 상세 페이지 파싱 (WebSquare API 응답)"""
from utils.logger import setup_logger

logger = setup_logger("detail_parser")


def parse_item_detail(data: dict) -> dict:
    """상세 페이지 API 응답에서 물건 상세정보 추출

    Args:
        data: 상세 API 응답 JSON

    Returns:
        상세 정보 dict
    """
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

    # 건물/토지 내역
    building_info = data.get("dlt_bldgInfo", [])
    if isinstance(building_info, dict):
        building_info = building_info.get("rows", [])

    for bldg in building_info:
        area = _safe_float(bldg.get("bldgAr"))
        if area:
            detail["building_area"] = (detail["building_area"] or 0) + area
        detail["floor_info"] = bldg.get("flrInfo", detail["floor_info"])

    land_info = data.get("dlt_landInfo", [])
    if isinstance(land_info, dict):
        land_info = land_info.get("rows", [])

    for land in land_info:
        area = _safe_float(land.get("landAr"))
        if area:
            detail["land_area"] = (detail["land_area"] or 0) + area

    # 임차인 현황
    tenant_list = data.get("dlt_tenantInfo", [])
    if isinstance(tenant_list, dict):
        tenant_list = tenant_list.get("rows", [])

    for tenant in tenant_list:
        detail["tenants"].append({
            "tenant_type": tenant.get("rltnPrsnDvs", ""),
            "deposit": _safe_int(tenant.get("bndAmt")),
            "move_in_date": _format_date(tenant.get("mvnDt", "")),
            "is_priority": tenant.get("oppsblYn", "") == "Y",
        })

    # 매각기일 히스토리
    history_list = data.get("dlt_saleHistory", [])
    if isinstance(history_list, dict):
        history_list = history_list.get("rows", [])

    for hist in history_list:
        detail["sale_history"].append({
            "sale_date": _format_date(hist.get("dspslDxdyYmd", "")),
            "min_bid_price": _safe_int(hist.get("lwsDspslPrc")),
            "result": hist.get("dspslRslt", ""),
            "winning_price": _safe_int(hist.get("scsfBdAmt")),
            "bidder_count": _safe_int(hist.get("bidCnt")),
        })

    # PDF 문서 링크
    doc_list = data.get("dlt_docInfo", [])
    if isinstance(doc_list, dict):
        doc_list = doc_list.get("rows", [])

    for doc in doc_list:
        doc_type = doc.get("docDvs", "")
        doc_url = doc.get("docUrl", "")
        if not doc_url:
            continue

        if "감정" in doc_type:
            detail["appraisal_pdf_url"] = doc_url
        elif "현황조사" in doc_type:
            detail["survey_pdf_url"] = doc_url
        elif "매각물건명세" in doc_type:
            detail["spec_pdf_url"] = doc_url

    logger.info(
        f"상세 파싱 완료: 임차인 {len(detail['tenants'])}명, "
        f"히스토리 {len(detail['sale_history'])}건"
    )
    return detail


def _format_date(date_str: str) -> str:
    """날짜 형식 변환 (20260319 → 2026-03-19)"""
    date_str = str(date_str).strip()
    if len(date_str) == 8 and date_str.isdigit():
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    return date_str


def _safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        cleaned = str(value).replace(",", "").replace("원", "").strip()
        return int(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        cleaned = str(value).replace("㎡", "").replace(",", "").strip()
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None
