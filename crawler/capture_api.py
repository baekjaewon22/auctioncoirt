"""courtauction.go.kr의 실제 API 요청을 캡처하는 스크립트

브라우저에서 검색을 실행하고, 발생하는 네트워크 요청을 캡처합니다.
이를 통해 정확한 API 엔드포인트와 페이로드 형식을 파악합니다.
"""
import json
import time
from playwright.sync_api import sync_playwright

BASE_URL = "https://www.courtauction.go.kr"
captured_requests = []


def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 화면 표시
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="ko-KR",
        )
        page = context.new_page()

        # 모든 요청 캡처
        def on_request(request):
            if request.method == "POST" and ".on" in request.url:
                captured_requests.append({
                    "url": request.url,
                    "method": request.method,
                    "headers": dict(request.headers),
                    "post_data": request.post_data,
                })
                print(f"\n[캡처] POST {request.url}")
                if request.post_data:
                    print(f"  Body: {request.post_data[:500]}")

        def on_response(response):
            if response.request.method == "POST" and ".on" in response.url:
                print(f"  → Status: {response.status}, Type: {response.headers.get('content-type', 'unknown')}")

        page.on("request", on_request)
        page.on("response", on_response)

        # 페이지 접속
        print("courtauction.go.kr 접속 중...")
        page.goto(f"{BASE_URL}/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ157M00.xml")
        page.wait_for_load_state("networkidle")
        time.sleep(3)

        print("\n=== 페이지 로드 완료 ===")
        print("브라우저에서 직접 검색 버튼을 클릭해주세요.")
        print("캡처된 요청은 자동으로 표시됩니다.")
        print("종료하려면 이 터미널에서 Ctrl+C를 누르세요.\n")

        try:
            # 사용자가 브라우저에서 조작할 때까지 대기
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

        # 결과 저장
        if captured_requests:
            with open("output/captured_requests.json", "w", encoding="utf-8") as f:
                json.dump(captured_requests, f, ensure_ascii=False, indent=2)
            print(f"\n총 {len(captured_requests)}개 요청 캡처 → output/captured_requests.json")

        browser.close()


if __name__ == "__main__":
    import os
    os.makedirs("output", exist_ok=True)
    capture()
