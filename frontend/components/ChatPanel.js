import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

export default function ChatPanel({ meetingId, currentUserId, currentUserType }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchMessages = () => {
    if (!meetingId) return;
    api.getChatHistory(meetingId, "limit=50").then((data) => {
      setMessages(data.messages || []);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(intervalRef.current);
  }, [meetingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      await api.sendMessage({
        meeting_id: meetingId,
        sender_id: currentUserId,
        sender_type: currentUserType,
        receiver_id: "target",
        receiver_type: "booth_member",
        message: input.trim(),
      });
      setInput("");
      fetchMessages();
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">채팅</div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{ padding: "40px 10px" }}>
            <p>메시지가 없습니다</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.sender_id === currentUserId ? "sent" : "received"}`}
          >
            <div>{msg.message}</div>
            <div className="msg-time">
              {msg.sender_name} &middot; {new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          전송
        </button>
      </div>
    </div>
  );
}
