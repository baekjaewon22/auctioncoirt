"""Kakao 주소 API를 이용한 지오코딩"""
import os
import time
import requests
from utils.logger import setup_logger

logger = setup_logger("geocoder")

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
GEOCODE_URL = "https://dapi.kakao.com/v2/local/search/address.json"
GEOCODE_DELAY = 0.2  # 초당 5회 제한


def geocode_address(address: str) -> tuple[float, float] | None:
    """주소를 위도/경도로 변환

    Args:
        address: 검색할 주소 문자열

    Returns:
        (위도, 경도) 튜플 또는 None
    """
    if not KAKAO_REST_API_KEY:
        logger.warning("KAKAO_REST_API_KEY 미설정 - 지오코딩 건너뜀")
        return None

    if not address or not address.strip():
        return None

    try:
        response = requests.get(
            GEOCODE_URL,
            params={"query": address},
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            timeout=5,
        )
        response.raise_for_status()

        data = response.json()
        documents = data.get("documents", [])

        if documents:
            doc = documents[0]
            lat = float(doc["y"])
            lng = float(doc["x"])
            logger.debug(f"지오코딩 성공: {address} → ({lat}, {lng})")
            return (lat, lng)

        logger.debug(f"지오코딩 결과 없음: {address}")
        return None

    except Exception as e:
        logger.error(f"지오코딩 오류: {address} - {e}")
        return None
    finally:
        time.sleep(GEOCODE_DELAY)


def batch_geocode(items: list[dict]) -> list[dict]:
    """물건 목록에 대해 일괄 지오코딩

    Args:
        items: address_full 필드가 있는 물건 목록

    Returns:
        latitude, longitude가 추가된 물건 목록
    """
    geocoded = 0
    for item in items:
        if item.get("latitude") and item.get("longitude"):
            continue

        address = item.get("address_full", "")
        result = geocode_address(address)
        if result:
            item["latitude"] = result[0]
            item["longitude"] = result[1]
            geocoded += 1

    logger.info(f"지오코딩 완료: {geocoded}/{len(items)}건")
    return items
