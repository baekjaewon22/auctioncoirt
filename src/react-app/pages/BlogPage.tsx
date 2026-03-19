import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, authHeaders } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { api, formatPrice } from "../lib/api";

export default function BlogPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	if (!user) {
		navigate("/login");
		return null;
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<h2 className="text-xl font-bold text-gray-900 mb-2">블로그 자동화</h2>
			<p className="text-sm text-gray-400 mb-6">크롤링된 물건으로 AI 블로그 글을 생성하고 네이버/티스토리에 발행합니다</p>

			{/* 크롤링된 물건 목록 */}
			<ItemList />

			{/* 발행 이력 */}
			<PostHistory />
		</div>
	);
}

function ItemList() {
	const { data, isLoading } = useQuery({
		queryKey: ["my-items"],
		queryFn: () => api.getItems({ limit: "50" }),
	});

	const [generating, setGenerating] = useState<number | null>(null);
	const [preview, setPreview] = useState<{ postId: number; title: string; content: string } | null>(null);
	const queryClient = useQueryClient();

	const handleGenerate = async (itemId: number) => {
		setGenerating(itemId);
		try {
			const res = await fetch("/api/blog/generate", {
				method: "POST",
				headers: { ...authHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({ itemId }),
			});
			const data = await res.json() as { data?: { postId: number; title: string; content: string }; error?: string };
			if (data.data) {
				setPreview(data.data);
				queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
			} else {
				alert(data.error || "생성 실패");
			}
		} catch (e) {
			alert(`오류: ${e}`);
		}
		setGenerating(null);
	};

	const handlePublish = async (platform: "naver" | "tistory") => {
		if (!preview) return;
		try {
			const res = await fetch(`/api/blog/publish/${platform}`, {
				method: "POST",
				headers: { ...authHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({ postId: preview.postId }),
			});
			const data = await res.json() as { data?: { url: string }; error?: string };
			if (data.data?.url) {
				alert(`발행 완료!\n${data.data.url}`);
				queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
			} else {
				alert(data.error || "발행 실패");
			}
		} catch (e) {
			alert(`오류: ${e}`);
		}
	};

	if (isLoading) return <div className="text-center py-8 text-gray-400">로딩 중...</div>;

	return (
		<>
			<div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
				<div className="bg-gray-50 px-4 py-3 border-b">
					<h3 className="text-sm font-bold text-gray-700">크롤링된 물건 ({data?.pagination.total ?? 0}건)</h3>
				</div>
				<div className="divide-y">
					{data?.data.map((item) => (
						<div key={item.id} className="px-4 py-3 flex items-center justify-between">
							<div className="flex items-center gap-3 min-w-0 flex-1">
								{item.image_url && (
									<img src={item.image_url} alt="" className="w-12 h-10 object-cover rounded border shrink-0" />
								)}
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{item.item_type}</span>
										<span className="text-xs text-gray-400">{item.case_no}</span>
									</div>
									<p className="text-sm text-gray-800 truncate">{item.address_full}</p>
									<p className="text-xs text-gray-400">
										감정가 {formatPrice(item.appraisal_price)} | 최저가 {formatPrice(item.min_bid_price)}
										{item.bid_rate != null && ` (${item.bid_rate}%)`}
									</p>
								</div>
							</div>
							<button
								onClick={() => handleGenerate(item.id)}
								disabled={generating === item.id}
								className="shrink-0 ml-3 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
							>
								{generating === item.id ? "생성중..." : "AI 글 생성"}
							</button>
						</div>
					))}
					{(!data || data.data.length === 0) && (
						<div className="px-4 py-8 text-center text-gray-400 text-sm">
							크롤링된 물건이 없습니다. 설정에서 마이옥션 계정을 등록하고 크롤링을 실행해주세요.
						</div>
					)}
				</div>
			</div>

			{/* AI 생성 미리보기 */}
			{preview && (
				<div className="bg-white rounded-lg shadow-sm mb-6">
					<div className="bg-green-50 px-4 py-3 border-b flex items-center justify-between">
						<h3 className="text-sm font-bold text-green-800">AI 생성 결과 미리보기</h3>
						<div className="flex gap-2">
							<button onClick={() => handlePublish("naver")}
								className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700">
								네이버 발행
							</button>
							<button onClick={() => handlePublish("tistory")}
								className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-600">
								티스토리 발행
							</button>
							<button onClick={() => setPreview(null)}
								className="text-gray-400 hover:text-gray-600 px-2 py-1 text-xs">
								닫기
							</button>
						</div>
					</div>
					<div className="p-4">
						<h4 className="text-lg font-bold text-gray-900 mb-3">{preview.title}</h4>
						<div className="prose prose-sm max-w-none border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto"
							dangerouslySetInnerHTML={{ __html: preview.content }} />
					</div>
				</div>
			)}
		</>
	);
}

function PostHistory() {
	const { data } = useQuery({
		queryKey: ["blog-posts"],
		queryFn: async () => {
			const res = await fetch("/api/blog/posts", { headers: authHeaders() });
			return res.json() as Promise<{ data: { id: number; platform: string; post_title: string; post_url: string; status: string; created_at: string; case_no: string; item_type: string }[] }>;
		},
	});

	if (!data?.data?.length) return null;

	return (
		<div className="bg-white rounded-lg shadow-sm">
			<div className="bg-gray-50 px-4 py-3 border-b">
				<h3 className="text-sm font-bold text-gray-700">발행 이력</h3>
			</div>
			<div className="divide-y">
				{data.data.map((post) => (
					<div key={post.id} className="px-4 py-3 flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-800">{post.post_title}</p>
							<p className="text-xs text-gray-400">
								{post.case_no} | {post.platform} | {post.created_at}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<span className={`text-xs px-2 py-0.5 rounded ${
								post.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
							}`}>
								{post.status === "published" ? "발행완료" : "임시저장"}
							</span>
							{post.post_url && (
								<a href={post.post_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
									보기
								</a>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
