const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  getConfig: () => request('/api/config'),
  // Meetings
  createMeeting: (data) => request('/api/meetings', { method: 'POST', body: JSON.stringify(data) }),
  listMeetings: (params = '') => request(`/api/meetings${params ? '?' + params : ''}`),
  getMeeting: (id) => request(`/api/meetings/${id}`),
  confirmMeeting: (id, data) => request(`/api/meetings/${id}/confirm`, { method: 'POST', body: JSON.stringify(data) }),
  counterOffer: (id, data) => request(`/api/meetings/${id}/counter-offer`, { method: 'POST', body: JSON.stringify(data) }),
  declineMeeting: (id, data) => request(`/api/meetings/${id}/decline`, { method: 'POST', body: JSON.stringify(data) }),
  cancelMeeting: (id, data) => request(`/api/meetings/${id}/cancel`, { method: 'POST', body: JSON.stringify(data) }),
  // Booths
  listBooths: () => request('/api/booths'),
  getBoothSlots: (id) => request(`/api/booths/${id}/slots`),
  getBoothMembers: (id) => request(`/api/booths/${id}/members`),
  // Visitors
  listVisitors: () => request('/api/visitors'),
  // Chat
  getChatHistory: (meetingId, params = '') => request(`/api/meetings/${meetingId}/chat${params ? '?' + params : ''}`),
  sendMessage: (data) => request('/api/chat/message', { method: 'POST', body: JSON.stringify(data) }),
};
