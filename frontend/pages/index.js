import { useState, useEffect } from "react";
import Head from "next/head";
import { api } from "@/lib/api";
import MeetingCard from "@/components/MeetingCard";

const TABS = [
  { key: "", label: "전체" },
  { key: "pending", label: "대기 중" },
  { key: "confirmed", label: "확정됨" },
  { key: "counter_offered", label: "역제안" },
  { key: "declined", label: "거절됨" },
  { key: "cancelled", label: "취소됨" },
];

export default function MeetingListPage() {
  const [meetings, setMeetings] = useState([]);
  const [tab, setTab] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMeetings = (status) => {
    setLoading(true);
    const params = status ? `status=${status}` : "";
    api.listMeetings(params)
      .then((data) => setMeetings(data.items || []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMeetings(tab);
  }, [tab]);

  return (
    <>
      <Head>
        <title>미팅 목록 - Exhibition Meeting</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div>
        <h2 className="page-title">미팅 목록</h2>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "#999", padding: 40 }}>로딩 중...</p>
        ) : meetings.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>미팅 신청 내역이 없습니다</p>
            <a href="/meetings/new" className="btn btn-primary">미팅 신청하기</a>
          </div>
        ) : (
          meetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
        )}
      </div>
    </>
  );
}
