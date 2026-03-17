import Link from "next/link";

const statusLabels = {
  pending: "대기 중",
  confirmed: "확정됨",
  counter_offered: "역제안 받음",
  declined: "거절됨",
  cancelled: "취소됨",
};

export default function MeetingCard({ meeting }) {
  return (
    <Link href={`/meetings/${meeting.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {meeting.initiator?.name} &rarr; {meeting.target?.name}
          </span>
          <span className={`badge badge-${meeting.status}`}>
            {statusLabels[meeting.status] || meeting.status}
          </span>
        </div>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>{meeting.message}</p>
        {meeting.offered_slots?.length > 0 && (
          <div className="slot-chips" style={{ marginBottom: 8 }}>
            {meeting.offered_slots.map((slot, i) => (
              <span key={i} className="slot-chip" style={{ cursor: "default" }}>
                {slot.location_name} {slot.start_time}-{slot.end_time}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#999" }}>
          {new Date(meeting.created_at).toLocaleString("ko-KR")}
        </div>
      </div>
    </Link>
  );
}
