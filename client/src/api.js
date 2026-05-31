const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const fetchRooms = () => request('/accommodations/rooms');
export const fetchCottages = () => request('/accommodations/cottages');

export const createReservation = (payload) =>
  request('/reservations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const fetchReservations = (params = {}) => {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/reservations${suffix}`);
};

export const updateReservationStatus = (id, status) =>
  request(`/reservations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

export const adminLogin = (username, password) =>
  request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

export const fetchSummary = (token) =>
  request('/admin/summary', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
