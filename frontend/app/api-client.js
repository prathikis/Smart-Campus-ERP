const API_BASE = "http://localhost:5000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("smartcampus_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const ApiClient = {
  // ============= AUTH =============
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("smartcampus_token", data.token);
    localStorage.setItem("smartcampus_user", JSON.stringify(data.user));
    return data;
  },

  async verifySession() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Session expired");
    return res.json();
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
      });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("smartcampus_token");
    localStorage.removeItem("smartcampus_user");
  },

  getStoredUser() {
    const raw = typeof window !== "undefined" ? localStorage.getItem("smartcampus_user") : null;
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return typeof window !== "undefined" && !!localStorage.getItem("smartcampus_token");
  },

  // ============= STUDENTS =============
  async getStudents() {
    const res = await fetch(`${API_BASE}/students`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addStudent(student) {
    const res = await fetch(`${API_BASE}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(student),
    });
    return res.json();
  },
  async updateStudent(id, data) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteStudent(id) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= FACULTY =============
  async getFaculty() {
    const res = await fetch(`${API_BASE}/faculty`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addFaculty(faculty) {
    const res = await fetch(`${API_BASE}/faculty`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(faculty),
    });
    return res.json();
  },
  async deleteFaculty(id) {
    const res = await fetch(`${API_BASE}/faculty/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= BOOKS =============
  async getBooks() {
    const res = await fetch(`${API_BASE}/books`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addBook(book) {
    const res = await fetch(`${API_BASE}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(book),
    });
    return res.json();
  },
  async borrowBook(isbn, studentName) {
    const res = await fetch(`${API_BASE}/books/${isbn}/borrow`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ studentName }),
    });
    return res.json();
  },
  async returnBook(isbn) {
    const res = await fetch(`${API_BASE}/books/${isbn}/return`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= TRANSACTIONS =============
  async getTransactions() {
    const res = await fetch(`${API_BASE}/transactions`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addTransaction(txn) {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(txn),
    });
    return res.json();
  },

  // ============= ACTIVITIES =============
  async getActivities() {
    const res = await fetch(`${API_BASE}/activities`, { headers: getAuthHeaders() });
    return res.json();
  },

  // ============= ANALYTICS =============
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`, { headers: getAuthHeaders() });
    return res.json();
  },

  // ============= NOTIFICATIONS =============
  async getNotifications(role = "admin") {
    const res = await fetch(`${API_BASE}/notifications?role=${role}`, { headers: getAuthHeaders() });
    return res.json();
  },
  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= ANNOUNCEMENTS =============
  async getAnnouncements() {
    const res = await fetch(`${API_BASE}/announcements`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addAnnouncement(announcement) {
    const res = await fetch(`${API_BASE}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(announcement),
    });
    return res.json();
  },

  // ============= ADMISSIONS =============
  async getAdmissions() {
    const res = await fetch(`${API_BASE}/admissions`, { headers: getAuthHeaders() });
    return res.json();
  },
  async submitAdmission(admission) {
    const res = await fetch(`${API_BASE}/admissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(admission),
    });
    return res.json();
  },
  async approveAdmission(id) {
    const res = await fetch(`${API_BASE}/admissions/${id}/approve`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  async rejectAdmission(id) {
    const res = await fetch(`${API_BASE}/admissions/${id}/reject`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};
