import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "@/lib/api";
import ChatPanel from "@/components/ChatPanel";
import SlotSelector from "@/components/SlotSelector";

const statusLabels = {
  pending: "대기 중",
  confirmed: "확정됨",
  counter_offered: "역제안 받음",
  declined: "거절됨",
  cancelled: "취소됨",
};

export default function MeetingDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [counterSlots, setCounterSlots] = useState([]);
  const [declineReason, setDeclineReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMeeting = () => {
    if (!id) return;
    api.getMeeting(id)
      .then(setMeeting)
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const handleConfirm = async (slotId) => {
    if (!confirm("이 슬롯으로 미팅을 확정하시겠습니까?")) return;
    setActionLoading(true);
    try {
      await api.confirmMeeting(id, {
        confirmed_slot_id: slotId,
        confirmed_by_member_id: "member-001",
      });
      alert("미팅이 확정되었습니다!");
      fetchMeeting();
    } catch (e) {
      alert("확정 실패: " + e.message);
    }
    setActionLoading(false);
  };

  const handleCounterOffer = async () => {
    if (counterSlots.length === 0) {
      alert("역제안할 슬롯을 선택해주세요.");
      return;
    }
    setActionLoading(true);
    try {
      await api.counterOffer(id, {
        counter_slots: counterSlots,
        proposed_by_member_id: "member-001",
      });
      alert("역제안이 전송되었습니다!");
      setShowCounterModal(false);
      fetchMeeting();
    } catch (e) {
      alert("역제안 실패: " + e.message);
    }
    setActionLoading(false);
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }
    setActionLoading(true);
    try {
      await api.declineMeeting(id, {
        decline_reason: declineReason.trim(),
        declined_by_member_id: "member-001",
      });
      alert("미팅이 거절되었습니다.");
      setShowDeclineModal(false);
      fetchMeeting();
    } catch (e) {
      alert("거절 실패: " + e.message);
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert("취소 사유를 입력해주세요.");
      return;
    }
    setActionLoading(true);
    try {
      await api.cancelMeeting(id, {
        cancel_reason: cancelReason.trim(),
        cancelled_by: "visitor-001",
      });
      alert("미팅이 취소되었습니다.");
      setShowCancelModal(false);
      fetchMeeting();
    } catch (e) {
      alert("취소 실패: " + e.message);
    }
    setActionLoading(false);
  };

  if (loading) return <p style={{ textAlign: "center", padding: 40, color: "#999" }}>로딩 중...</p>;
  if (!meeting) return <p style={{ textAlign: "center", padding: 40, color: "#999" }}>미팅을 찾을 수 없습니다</p>;

  const canRespond = meeting.status === "pending" || meeting.status === "counter_offered";
  const canCancel = meeting.status === "confirmed" || meeting.status === "pending" || meeting.status === "counter_offered";

  return (
    <div>
      <button className="btn btn-outline btn-sm" onClick={() => router.push("/")} style={{ marginBottom: 16 }}>
        &larr; 목록으로
      </button>

      <div className="grid-2">
        <div>
          {/* Meeting info */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">미팅 상세</span>
              <span className={`badge badge-${meeting.status}`}>
                {statusLabels[meeting.status] || meeting.status}
              </span>
            </div>

            <div className="detail-section">
              <h3>신청자</h3>
              <p>
                {meeting.initiator?.name}
                {meeting.initiator?.company && ` (${meeting.initiator.company})`}
                {meeting.initiator?.booth && ` - ${meeting.initiator.booth.name}`}
              </p>
            </div>

            <div className="detail-section">
              <h3>대상</h3>
              <p>
                {meeting.target?.name}
                {meeting.target?.booth && ` - ${meeting.target.booth.name}`}
              </p>
            </div>

            <div className="detail-section">
              <h3>신청 메시지</h3>
              <p>{meeting.message}</p>
              {meeting.notes && (
                <p style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
                  추가: {meeting.notes}
                </p>
              )}
            </div>

            <div className="detail-section">
              <h3>제시된 슬롯</h3>
              <div className="slot-chips">
                {meeting.offered_slots?.map((slot, i) => (
                  <button
                    key={i}
                    className="slot-chip"
                    onClick={() => canRespond && handleConfirm(slot.slot_id)}
                    disabled={!canRespond || actionLoading}
                    title={canRespond ? "클릭하여 이 슬롯으로 확정" : ""}
                    style={{ cursor: canRespond ? "pointer" : "default" }}
                  >
                    {slot.location_name} {slot.start_time}-{slot.end_time}
                    {canRespond && " ✓"}
                  </button>
                ))}
              </div>
              {canRespond && (
                <p style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                  슬롯을 클릭하면 해당 시간으로 미팅이 확정됩니다
                </p>
              )}
            </div>

            {meeting.confirmation && (
              <div className="detail-section">
                <h3>확정된 슬롯</h3>
                <div className="slot-chip selected" style={{ cursor: "default" }}>
                  {meeting.confirmation.slot_detail?.location_name}{" "}
                  {meeting.confirmation.slot_detail?.start_time}-{meeting.confirmation.slot_detail?.end_time}
                </div>
              </div>
            )}

            {/* Actions */}
            {(canRespond || canCancel) && (
              <div className="actions-bar">
                {canRespond && (
                  <>
                    <button className="btn btn-warning btn-sm" onClick={() => setShowCounterModal(true)}>
                      역제안
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDeclineModal(true)}>
                      거절
                    </button>
                  </>
                )}
                {canCancel && (
                  <button className="btn btn-outline btn-sm" onClick={() => setShowCancelModal(true)}>
                    취소
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          {meeting.timeline?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>타임라인</h3>
              <div className="timeline">
                {meeting.timeline.map((item, i) => (
                  <div key={i} className="timeline-item">
                    <div>{item.actor} - {statusLabels[item.action] || item.action}</div>
                    <div className="time">{new Date(item.timestamp).toLocaleString("ko-KR")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div>
          <ChatPanel
            meetingId={id}
            currentUserId="visitor-001"
            currentUserType="visitor"
          />
        </div>
      </div>

      {/* Counter Offer Modal */}
      {showCounterModal && (
        <div className="modal-overlay" onClick={() => setShowCounterModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>역제안</h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>다른 시간을 제시하세요</p>
            <SlotSelector
              boothId={meeting.booth_id}
              maxSlots={3}
              onSelectionChange={setCounterSlots}
            />
            <div className="actions-bar" style={{ marginTop: 20 }}>
              <button className="btn btn-warning" onClick={handleCounterOffer} disabled={actionLoading}>
                {actionLoading ? "처리 중..." : "역제안 전송"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowCounterModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>미팅 거절</h2>
            <div className="form-group">
              <label>거절 사유 *</label>
              <textarea
                className="form-textarea"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="거절 사유를 입력해주세요"
                rows={3}
              />
            </div>
            <div className="actions-bar">
              <button className="btn btn-danger" onClick={handleDecline} disabled={actionLoading || !declineReason.trim()}>
                {actionLoading ? "처리 중..." : "거절"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowDeclineModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>미팅 취소</h2>
            <div className="form-group">
              <label>취소 사유 * (필수)</label>
              <textarea
                className="form-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="취소 사유를 입력해주세요"
                rows={3}
              />
            </div>
            <div className="actions-bar">
              <button className="btn btn-danger" onClick={handleCancel} disabled={actionLoading || !cancelReason.trim()}>
                {actionLoading ? "처리 중..." : "취소 확인"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowCancelModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
