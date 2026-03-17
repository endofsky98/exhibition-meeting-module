import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function SlotSelector({ boothId, maxSlots = 3, onSelectionChange }) {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!boothId) return;
    setLoading(true);
    setSelected([]);
    api.getBoothSlots(boothId).then((data) => {
      setLocations(data.locations || []);
    }).catch(() => {
      setLocations([]);
    }).finally(() => setLoading(false));
  }, [boothId]);

  const toggleSlot = (locationId, slotId) => {
    setSelected((prev) => {
      const key = `${locationId}:${slotId}`;
      const exists = prev.find((s) => `${s.location_id}:${s.slot_id}` === key);
      let next;
      if (exists) {
        next = prev.filter((s) => `${s.location_id}:${s.slot_id}` !== key);
      } else if (prev.length >= maxSlots) {
        return prev;
      } else {
        next = [...prev, { location_id: locationId, slot_id: slotId }];
      }
      onSelectionChange?.(next);
      return next;
    });
  };

  const isSelected = (locationId, slotId) =>
    selected.some((s) => s.location_id === locationId && s.slot_id === slotId);

  if (!boothId) return <p style={{ color: "#999", fontSize: 14 }}>부스를 먼저 선택하세요</p>;
  if (loading) return <p style={{ color: "#999", fontSize: 14 }}>슬롯 로딩 중...</p>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        최대 {maxSlots}개의 슬롯을 선택하세요 ({selected.length}/{maxSlots})
      </p>
      {locations.map((loc) => (
        <div key={loc.location_id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{loc.location_name}</p>
          <div className="slot-chips">
            {loc.slots.filter((s) => s.available).map((slot) => (
              <button
                key={slot.slot_id}
                className={`slot-chip ${isSelected(loc.location_id, slot.slot_id) ? "selected" : ""}`}
                onClick={() => toggleSlot(loc.location_id, slot.slot_id)}
                type="button"
              >
                {slot.start_time} - {slot.end_time}
              </button>
            ))}
          </div>
        </div>
      ))}
      {locations.length === 0 && (
        <p style={{ color: "#999", fontSize: 14 }}>사용 가능한 슬롯이 없습니다</p>
      )}
    </div>
  );
}
