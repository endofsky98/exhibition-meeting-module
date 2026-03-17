import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Exhibition Meeting Module API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory stores (replace with DB later) ───

booths_db = {
    "booth-001": {
        "id": "booth-001",
        "booth_name": "Samsung Booth",
        "company_name": "Samsung Electronics",
        "exhibition_id": "expo-2026-001",
    },
    "booth-002": {
        "id": "booth-002",
        "booth_name": "LG Booth",
        "company_name": "LG Electronics",
        "exhibition_id": "expo-2026-001",
    },
}

booth_members_db = {
    "member-001": {"member_id": "member-001", "name": "Kim", "email": "kim@samsung.com", "position": "Manager", "booth_id": "booth-001"},
    "member-002": {"member_id": "member-002", "name": "Lee", "email": "lee@samsung.com", "position": "Staff", "booth_id": "booth-001"},
    "member-003": {"member_id": "member-003", "name": "Park", "email": "park@lg.com", "position": "Manager", "booth_id": "booth-002"},
}

booth_locations_db = {
    "loc-001": {"location_id": "loc-001", "booth_id": "booth-001", "location_name": "Hall A - Booth 1"},
    "loc-002": {"location_id": "loc-002", "booth_id": "booth-001", "location_name": "Hall A - Booth 2"},
    "loc-003": {"location_id": "loc-003", "booth_id": "booth-002", "location_name": "Hall B - Booth 1"},
}

booth_time_slots_db = {
    "slot-001": {"slot_id": "slot-001", "location_id": "loc-001", "start_time": "10:00", "end_time": "10:30", "available": True},
    "slot-002": {"slot_id": "slot-002", "location_id": "loc-001", "start_time": "10:30", "end_time": "11:00", "available": True},
    "slot-003": {"slot_id": "slot-003", "location_id": "loc-001", "start_time": "11:00", "end_time": "11:30", "available": True},
    "slot-004": {"slot_id": "slot-004", "location_id": "loc-002", "start_time": "14:00", "end_time": "14:30", "available": True},
    "slot-005": {"slot_id": "slot-005", "location_id": "loc-002", "start_time": "14:30", "end_time": "15:00", "available": True},
    "slot-006": {"slot_id": "slot-006", "location_id": "loc-003", "start_time": "10:00", "end_time": "10:30", "available": True},
    "slot-007": {"slot_id": "slot-007", "location_id": "loc-003", "start_time": "11:00", "end_time": "11:30", "available": True},
}

visitors_db = {
    "visitor-001": {"id": "visitor-001", "name": "홍길동", "email": "hong@abc.com", "company": "ABC Corp", "position": "Engineer"},
    "visitor-002": {"id": "visitor-002", "name": "김철수", "email": "kim@xyz.com", "company": "XYZ Inc", "position": "Director"},
}

meetings_db: dict = {}
meeting_slot_offers_db: dict = {}
meeting_confirmations_db: dict = {}
meeting_cancellations_db: dict = {}
chat_messages_db: dict = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ─── Schemas ───

class SlotSelection(BaseModel):
    location_id: str
    slot_id: str


class CreateMeetingRequest(BaseModel):
    initiator_id: str
    initiator_type: str  # visitor | booth_member
    target_id: str
    target_type: str  # visitor | booth_member
    booth_id: str
    selected_slots: list[SlotSelection]
    message: str
    notes: Optional[str] = None


class ConfirmRequest(BaseModel):
    confirmed_slot_id: str
    confirmed_by_member_id: str


class CounterOfferRequest(BaseModel):
    counter_slots: list[SlotSelection]
    proposed_by_member_id: str


class DeclineRequest(BaseModel):
    decline_reason: str
    declined_by_member_id: str


class CancelRequest(BaseModel):
    cancel_reason: str
    cancelled_by: str


class ChatMessageRequest(BaseModel):
    meeting_id: Optional[str] = None
    sender_id: str
    sender_type: str
    receiver_id: str
    receiver_type: str
    message: str
    attachments: Optional[list] = None


# ─── Helper ───

def _resolve_name(user_id: str, user_type: str) -> str:
    if user_type == "visitor":
        v = visitors_db.get(user_id)
        return v["name"] if v else user_id
    m = booth_members_db.get(user_id)
    return m["name"] if m else user_id


def _slot_detail(slot_id: str):
    slot = booth_time_slots_db.get(slot_id)
    if not slot:
        return None
    loc = booth_locations_db.get(slot["location_id"], {})
    return {
        "slot_id": slot["slot_id"],
        "location_id": slot["location_id"],
        "location_name": loc.get("location_name", ""),
        "start_time": slot["start_time"],
        "end_time": slot["end_time"],
    }


# ─── Config API ───

@app.get("/api/config")
def get_config():
    return {
        "theme": {
            "primary": "#0066cc",
            "secondary": "#004499",
            "accent": "#ff6600",
            "background": "#ffffff",
            "surface": "#f5f5f5",
            "text": "#333333",
            "border": "#dddddd",
            "font": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            "spacing": "16px",
            "borderRadius": "8px",
        },
        "branding": {
            "exhibitionName": "Seoul Tech Expo 2026",
            "exhibitionId": "expo-2026-001",
            "logo": "/assets/logo.png",
        },
    }


# ─── Meetings ───

@app.post("/api/meetings", status_code=201)
def create_meeting(req: CreateMeetingRequest):
    meeting_id = f"meeting-{uuid.uuid4().hex[:8]}"
    ts = now_iso()

    meeting = {
        "id": meeting_id,
        "initiator_id": req.initiator_id,
        "initiator_type": req.initiator_type,
        "target_id": req.target_id,
        "target_type": req.target_type,
        "booth_id": req.booth_id,
        "status": "pending",
        "message": req.message,
        "notes": req.notes,
        "created_at": ts,
        "updated_at": ts,
        "timeline": [
            {"action": "created", "timestamp": ts, "actor": _resolve_name(req.initiator_id, req.initiator_type)}
        ],
        "counter_offer_count": 0,
    }
    meetings_db[meeting_id] = meeting

    offer_id = f"offer-{uuid.uuid4().hex[:8]}"
    offer = {
        "id": offer_id,
        "meeting_id": meeting_id,
        "offered_by": req.initiator_id,
        "slots": [s.model_dump() for s in req.selected_slots],
        "is_counter_offer": False,
        "created_at": ts,
    }
    meeting_slot_offers_db[offer_id] = offer

    return {"id": meeting_id, "status": "pending", "created_at": ts}


@app.get("/api/meetings")
def list_meetings(
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    items = list(meetings_db.values())

    if status:
        items = [m for m in items if m["status"] == status]
    if user_id:
        items = [m for m in items if m["initiator_id"] == user_id or m["target_id"] == user_id]

    total = len(items)
    items = items[offset: offset + limit]

    result = []
    for m in items:
        offers = [o for o in meeting_slot_offers_db.values() if o["meeting_id"] == m["id"]]
        latest_offer = max(offers, key=lambda o: o["created_at"]) if offers else None
        offered_slots = []
        if latest_offer:
            for s in latest_offer["slots"]:
                detail = _slot_detail(s["slot_id"])
                if detail:
                    offered_slots.append(detail)

        result.append({
            "id": m["id"],
            "initiator": {
                "id": m["initiator_id"],
                "name": _resolve_name(m["initiator_id"], m["initiator_type"]),
                "type": m["initiator_type"],
            },
            "target": {
                "id": m["target_id"],
                "name": _resolve_name(m["target_id"], m["target_type"]),
                "type": m["target_type"],
            },
            "booth_id": m["booth_id"],
            "status": m["status"],
            "message": m["message"],
            "offered_slots": offered_slots,
            "created_at": m["created_at"],
            "updated_at": m["updated_at"],
        })

    return {"total": total, "items": result}


@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    m = meetings_db.get(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    offers = [o for o in meeting_slot_offers_db.values() if o["meeting_id"] == meeting_id]
    latest_offer = max(offers, key=lambda o: o["created_at"]) if offers else None
    offered_slots = []
    if latest_offer:
        for s in latest_offer["slots"]:
            detail = _slot_detail(s["slot_id"])
            if detail:
                offered_slots.append(detail)

    confirmation = None
    for c in meeting_confirmations_db.values():
        if c["meeting_id"] == meeting_id:
            slot_detail = _slot_detail(c["confirmed_slot_id"])
            confirmation = {**c, "slot_detail": slot_detail}
            break

    initiator_info = {"id": m["initiator_id"], "type": m["initiator_type"], "name": _resolve_name(m["initiator_id"], m["initiator_type"])}
    if m["initiator_type"] == "visitor":
        v = visitors_db.get(m["initiator_id"])
        if v:
            initiator_info["company"] = v.get("company", "")
    else:
        bm = booth_members_db.get(m["initiator_id"])
        if bm:
            booth = booths_db.get(bm["booth_id"])
            initiator_info["booth"] = {"id": bm["booth_id"], "name": booth["booth_name"]} if booth else None

    target_info = {"id": m["target_id"], "type": m["target_type"], "name": _resolve_name(m["target_id"], m["target_type"])}
    if m["target_type"] == "booth_member":
        bm = booth_members_db.get(m["target_id"])
        if bm:
            booth = booths_db.get(bm["booth_id"])
            target_info["booth"] = {"id": bm["booth_id"], "name": booth["booth_name"]} if booth else None

    return {
        "id": m["id"],
        "initiator": initiator_info,
        "target": target_info,
        "status": m["status"],
        "booth_id": m["booth_id"],
        "offered_slots": offered_slots,
        "message": m["message"],
        "notes": m.get("notes"),
        "timeline": m.get("timeline", []),
        "confirmation": confirmation,
        "created_at": m["created_at"],
        "updated_at": m["updated_at"],
    }


@app.post("/api/meetings/{meeting_id}/confirm")
def confirm_meeting(meeting_id: str, req: ConfirmRequest):
    m = meetings_db.get(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if m["status"] not in ("pending", "counter_offered"):
        raise HTTPException(status_code=400, detail=f"Cannot confirm meeting in status: {m['status']}")

    ts = now_iso()
    m["status"] = "confirmed"
    m["updated_at"] = ts
    m["timeline"].append({"action": "confirmed", "timestamp": ts, "actor": _resolve_name(req.confirmed_by_member_id, "booth_member")})

    conf_id = f"conf-{uuid.uuid4().hex[:8]}"
    conf = {
        "id": conf_id,
        "meeting_id": meeting_id,
        "confirmed_slot_id": req.confirmed_slot_id,
        "confirmed_by_member_id": req.confirmed_by_member_id,
        "arranged_at": ts,
    }
    meeting_confirmations_db[conf_id] = conf

    slot_detail = _slot_detail(req.confirmed_slot_id)
    return {
        "id": meeting_id,
        "status": "confirmed",
        "confirmed_slot": slot_detail,
        "confirmed_at": ts,
    }


@app.post("/api/meetings/{meeting_id}/counter-offer")
def counter_offer(meeting_id: str, req: CounterOfferRequest):
    m = meetings_db.get(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if m["status"] not in ("pending", "counter_offered"):
        raise HTTPException(status_code=400, detail=f"Cannot counter-offer meeting in status: {m['status']}")
    if m["counter_offer_count"] >= 3:
        raise HTTPException(status_code=400, detail="Maximum counter-offer limit (3) reached")

    ts = now_iso()
    m["status"] = "counter_offered"
    m["updated_at"] = ts
    m["counter_offer_count"] += 1
    m["timeline"].append({"action": "counter_offered", "timestamp": ts, "actor": _resolve_name(req.proposed_by_member_id, "booth_member")})

    offer_id = f"offer-{uuid.uuid4().hex[:8]}"
    offer = {
        "id": offer_id,
        "meeting_id": meeting_id,
        "offered_by": req.proposed_by_member_id,
        "slots": [s.model_dump() for s in req.counter_slots],
        "is_counter_offer": True,
        "created_at": ts,
    }
    meeting_slot_offers_db[offer_id] = offer

    counter_slots = []
    for s in req.counter_slots:
        detail = _slot_detail(s.slot_id)
        if detail:
            counter_slots.append(detail)

    return {
        "id": meeting_id,
        "status": "counter_offered",
        "counter_slots": counter_slots,
        "proposed_at": ts,
    }


@app.post("/api/meetings/{meeting_id}/decline")
def decline_meeting(meeting_id: str, req: DeclineRequest):
    m = meetings_db.get(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if m["status"] in ("declined", "cancelled", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot decline meeting in status: {m['status']}")

    ts = now_iso()
    m["status"] = "declined"
    m["updated_at"] = ts
    m["timeline"].append({"action": "declined", "timestamp": ts, "actor": _resolve_name(req.declined_by_member_id, "booth_member")})

    return {
        "id": meeting_id,
        "status": "declined",
        "decline_reason": req.decline_reason,
        "declined_at": ts,
    }


@app.post("/api/meetings/{meeting_id}/cancel")
def cancel_meeting(meeting_id: str, req: CancelRequest):
    m = meetings_db.get(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if m["status"] in ("cancelled", "declined"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel meeting in status: {m['status']}")

    ts = now_iso()
    m["status"] = "cancelled"
    m["updated_at"] = ts
    m["timeline"].append({"action": "cancelled", "timestamp": ts, "actor": _resolve_name(req.cancelled_by, m["initiator_type"] if req.cancelled_by == m["initiator_id"] else m["target_type"])})

    cancel_id = f"cancel-{uuid.uuid4().hex[:8]}"
    cancellation = {
        "id": cancel_id,
        "meeting_id": meeting_id,
        "cancelled_by": req.cancelled_by,
        "cancel_reason": req.cancel_reason,
        "cancelled_at": ts,
    }
    meeting_cancellations_db[cancel_id] = cancellation

    return {
        "id": meeting_id,
        "status": "cancelled",
        "cancel_reason": req.cancel_reason,
        "cancelled_at": ts,
    }


# ─── Booth APIs ───

@app.get("/api/booths/{booth_id}/slots")
def get_booth_slots(booth_id: str):
    booth = booths_db.get(booth_id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    locations = [loc for loc in booth_locations_db.values() if loc["booth_id"] == booth_id]
    result_locations = []
    for loc in locations:
        slots = [
            {
                "slot_id": s["slot_id"],
                "start_time": s["start_time"],
                "end_time": s["end_time"],
                "available": s["available"],
            }
            for s in booth_time_slots_db.values()
            if s["location_id"] == loc["location_id"]
        ]
        result_locations.append({
            "location_id": loc["location_id"],
            "location_name": loc["location_name"],
            "slots": slots,
        })

    return {
        "booth_id": booth_id,
        "booth_name": booth["booth_name"],
        "locations": result_locations,
    }


@app.get("/api/booths/{booth_id}/members")
def get_booth_members(booth_id: str):
    booth = booths_db.get(booth_id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    members = [m for m in booth_members_db.values() if m["booth_id"] == booth_id]
    return {
        "booth_id": booth_id,
        "booth_name": booth["booth_name"],
        "members": members,
    }


# ─── Chat APIs ───

@app.get("/api/meetings/{meeting_id}/chat")
def get_chat_history(
    meeting_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    messages = [msg for msg in chat_messages_db.values() if msg.get("meeting_id") == meeting_id]
    messages.sort(key=lambda x: x["created_at"])
    total = len(messages)
    messages = messages[offset: offset + limit]

    return {
        "meeting_id": meeting_id,
        "total": total,
        "messages": messages,
    }


@app.post("/api/chat/message", status_code=201)
def send_chat_message(req: ChatMessageRequest):
    msg_id = f"msg-{uuid.uuid4().hex[:8]}"
    ts = now_iso()

    msg = {
        "id": msg_id,
        "meeting_id": req.meeting_id,
        "sender_id": req.sender_id,
        "sender_name": _resolve_name(req.sender_id, req.sender_type),
        "sender_type": req.sender_type,
        "receiver_id": req.receiver_id,
        "receiver_type": req.receiver_type,
        "message": req.message,
        "attachments": req.attachments,
        "read_at": None,
        "created_at": ts,
    }
    chat_messages_db[msg_id] = msg

    return {"id": msg_id, "status": "sent", "created_at": ts}


# ─── Booths list for frontend ───

@app.get("/api/booths")
def list_booths():
    return {"booths": list(booths_db.values())}


@app.get("/api/visitors")
def list_visitors():
    return {"visitors": list(visitors_db.values())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
