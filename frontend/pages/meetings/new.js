import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "@/lib/api";
import SlotSelector from "@/components/SlotSelector";

export default function NewMeetingPage() {
  const router = useRouter();
  const [booths, setBooths] = useState([]);
  const [selectedBoothId, setSelectedBoothId] = useState("");
  const [members, setMembers] = useState([]);
  const [targetId, setTargetId] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listBooths().then((data) => setBooths(data.booths || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBoothId) {
      setMembers([]);
      setTargetId("");
      return;
    }
    api.getBoothMembers(selectedBoothId)
      .then((data) => setMembers(data.members || []))
      .catch(() => setMembers([]));
  }, [selectedBoothId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBoothId || selectedSlots.length === 0 || !message.trim()) {
      alert("부스, 슬롯, 신청 이유를 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createMeeting({
        initiator_id: "visitor-001",
        initiator_type: "visitor",
        target_id: targetId || selectedBoothId,
        target_type: targetId ? "booth_member" : "booth_member",
        booth_id: selectedBoothId,
        selected_slots: selectedSlots,
        message: message.trim(),
        notes: notes.trim() || null,
      });
      alert("미팅 신청이 완료되었습니다!");
      router.push("/");
    } catch (err) {
      alert("신청 실패: " + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h2 className="page-title">미팅 신청</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div>
            {/* Target selection */}
            <div className="form-group">
              <label>부스 선택 *</label>
              <select
                className="form-select"
                value={selectedBoothId}
                onChange={(e) => setSelectedBoothId(e.target.value)}
              >
                <option value="">부스를 선택하세요</option>
                {booths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.booth_name} ({b.company_name})
                  </option>
                ))}
              </select>
            </div>

            {members.length > 0 && (
              <div className="form-group">
                <label>담당자 선택 (선택사항)</label>
                <select
                  className="form-select"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">부스 전체</option>
                  {members.map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.name} - {m.position}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Slot selection */}
            <div className="form-group">
              <label>시간 슬롯 선택 * (최대 3개)</label>
              <SlotSelector
                boothId={selectedBoothId}
                maxSlots={3}
                onSelectionChange={setSelectedSlots}
              />
            </div>
          </div>

          <div>
            {/* Message */}
            <div className="form-group">
              <label>신청 이유 *</label>
              <textarea
                className="form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="미팅을 신청하는 이유를 입력해주세요"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>추가 문의사항</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="추가로 문의할 사항이 있으면 입력해주세요"
                rows={3}
              />
            </div>

            <div className="actions-bar">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !selectedBoothId || selectedSlots.length === 0 || !message.trim()}
              >
                {submitting ? "신청 중..." : "미팅 신청"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => router.push("/")}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
