"""검색 결과 텍스트 파싱

courtauction.go.kr의 검색 결과 페이지 텍스트에서
물건 정보를 추출합니다.

결과 텍스트 형식 예시:
서울중앙지방법원2023타경3842(병합)
    서울중앙지방법원
    2023타경3842
    (병합)    1
    서울특별시 강동구 ...
    [아파트 30.8㎡]
            166,000,000
    경매12계
    2026.03.19
    기타    84,992,000 (51%)    유찰 3회
"""
import re
from utils.logger import setup_logger

logger = setup_logger("list_parser")


def parse_result_text(text: str) -> tuple[list[dict], int]:
    """결과 텍스트에서 물건 목록 추출

    Args:
        text: 페이지 전체 텍스트 (body.innerText)

    Returns:
        (물건 목록, 총 건수) 튜플
    """
    items = []

    # 총 건수 추출
    total_match = re.search(r'총\s*(?:물건수)?\s*(\d[\d,]*)\s*건', text)
    total_count = int(total_match.group(1).replace(",", "")) if total_match else 0

    # 사건번호 패턴으로 물건 블록 분리
    # 패턴: "법원명 연도타경번호" (예: 서울중앙지방법원2023타경3842)
    case_pattern = re.compile(
        r'([가-힣]+(?:지방법원|지법))\s*(\d{4}타경\d+)(?:\s*\d{4}타경\d+)*\s*(?:\(([^)]*)\))?'
    )

    # 테이블 행 데이터 추출 - 탭/줄바꿈으로 구분된 데이터
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # 사건번호 포함 행 찾기
        case_match = case_pattern.search(line)
        if case_match:
            item = _extract_item_block(lines, i, case_match)
            if item:
                items.append(item)

        i += 1

    # 중복 제거 (같은 사건번호+물건번호)
    seen = set()
    unique_items = []
    for item in items:
        key = f"{item['case_no']}_{item['item_no']}"
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    logger.info(f"파싱 완료: {len(unique_items)}건 / 총 {total_count}건")
    return unique_items, total_count


def _extract_item_block(lines: list[str], start_idx: int, case_match) -> dict | None:
    """사건번호가 발견된 위치에서 물건 정보 블록 추출"""
    court_name = case_match.group(1)
    case_no = case_match.group(2)
    merge_info = case_match.group(3) or ""

    # 주변 라인에서 정보 수집 (위아래 10줄)
    block = "\n".join(lines[max(0, start_idx):min(len(lines), start_idx + 15)])

    item = {
        "case_no": case_no,
        "item_no": _extract_item_no(block) or 1,
        "court_name": court_name,
        "court_code": "",
        "address_full": _extract_address(block),
        "sido": "",
        "sigu": "",
        "dong": "",
        "item_type": _extract_item_type(block),
        "item_detail": _extract_detail(block),
        "appraisal_price": _extract_price(block, "감정") or _extract_first_price(block),
        "min_bid_price": _extract_min_price(block),
        "bid_rate": _extract_rate(block),
        "sale_date": _extract_date(block),
        "sale_time": "",
        "status": _extract_status(block),
        "fail_count": _extract_fail_count(block),
    }

    # 시도/시군구/동 분리
    if item["address_full"]:
        parts = item["address_full"].split()
        if len(parts) >= 1:
            item["sido"] = parts[0]
        if len(parts) >= 2:
            item["sigu"] = parts[1]
        if len(parts) >= 3:
            item["dong"] = parts[2]

    return item


def _extract_item_no(block: str) -> int | None:
    """물건번호 추출"""
    # 사건번호 다음에 나오는 단독 숫자
    match = re.search(r'\)\s*(\d{1,3})\s', block)
    if match:
        return int(match.group(1))
    return None


def _extract_address(block: str) -> str:
    """주소 추출"""
    # 시도명으로 시작하는 줄
    for line in block.split('\n'):
        line = line.strip()
        if re.match(r'(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충[북남]|전[북남]|경[북남]|제주)', line):
            # [건물정보] 제거
            addr = re.sub(r'\[.*?\]', '', line).strip()
            return addr
    return ""


def _extract_item_type(block: str) -> str:
    """물건종류 추출"""
    types = ["아파트", "오피스텔", "빌라", "연립", "다세대", "단독", "다가구",
             "상가", "토지", "공장", "창고", "근린", "주상복합", "기타"]
    for t in types:
        if t in block:
            return t
    # [용도] 패턴에서 추출
    match = re.search(r'(주거|상업|업무|공업|농지|임야|잡종)', block)
    if match:
        return match.group(1)
    return ""


def _extract_detail(block: str) -> str:
    """건물내역 추출 [대괄호 안의 정보]"""
    match = re.search(r'\[([^\]]+)\]', block)
    return match.group(1) if match else ""


def _extract_first_price(block: str) -> int | None:
    """첫 번째 가격 추출 (감정가)"""
    prices = re.findall(r'(\d{1,3}(?:,\d{3})+)', block)
    if prices:
        return int(prices[0].replace(",", ""))
    return None


def _extract_price(block: str, keyword: str) -> int | None:
    """특정 키워드 근처의 가격 추출"""
    # 키워드 포함 줄에서 금액 추출
    for line in block.split('\n'):
        if keyword in line:
            match = re.search(r'(\d{1,3}(?:,\d{3})+)', line)
            if match:
                return int(match.group(1).replace(",", ""))
    return None


def _extract_min_price(block: str) -> int | None:
    """최저매각가격 추출 - 퍼센트가 있는 줄"""
    match = re.search(r'(\d{1,3}(?:,\d{3})+)\s*\(\d+%\)', block)
    if match:
        return int(match.group(1).replace(",", ""))
    return None


def _extract_rate(block: str) -> float | None:
    """매각가율 추출"""
    match = re.search(r'\((\d+)%\)', block)
    if match:
        return float(match.group(1))
    return None


def _extract_date(block: str) -> str:
    """매각기일 추출"""
    match = re.search(r'(\d{4}\.\d{2}\.\d{2})', block)
    if match:
        return match.group(1).replace(".", "-")
    return ""


def _extract_status(block: str) -> str:
    """진행상태 추출"""
    if "유찰" in block:
        count = _extract_fail_count(block)
        return f"유찰{count}회" if count else "유찰"
    if "낙찰" in block:
        return "낙찰"
    if "취하" in block:
        return "취하"
    return "진행중"


def _extract_fail_count(block: str) -> int:
    """유찰횟수 추출"""
    match = re.search(r'유찰\s*(\d+)\s*회', block)
    if match:
        return int(match.group(1))
    return 0
