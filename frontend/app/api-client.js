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

  // ============= NEW FACILITIES =============

  // ============= HOSTEL MANAGEMENT =============
  async getHostelRooms() {
    const res = await fetch(`${API_BASE}/hostel/rooms`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addHostelRoom(room) {
    const res = await fetch(`${API_BASE}/hostel/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(room),
    });
    return res.json();
  },
  async allocateHostelRoom(id, studentId) {
    const res = await fetch(`${API_BASE}/hostel/rooms/${id}/allocate`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ studentId }),
    });
    return res.json();
  },
  async getHostelMess() {
    const res = await fetch(`${API_BASE}/hostel/mess`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addHostelMess(mess) {
    const res = await fetch(`${API_BASE}/hostel/mess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(mess),
    });
    return res.json();
  },
  async getHostelVisitors() {
    const res = await fetch(`${API_BASE}/hostel/visitors`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addHostelVisitor(visitor) {
    const res = await fetch(`${API_BASE}/hostel/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(visitor),
    });
    return res.json();
  },
  async checkoutHostelVisitor(id, checkOutTime) {
    const res = await fetch(`${API_BASE}/hostel/visitors/${id}/checkout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ checkOutTime }),
    });
    return res.json();
  },

  // ============= LIBRARY MANAGEMENT (ENHANCED) =============
  async getLibraryReservations() {
    const res = await fetch(`${API_BASE}/library/reservations`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addLibraryReservation(reservation) {
    const res = await fetch(`${API_BASE}/library/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(reservation),
    });
    return res.json();
  },
  async getLibraryFines() {
    const res = await fetch(`${API_BASE}/library/fines`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addLibraryFine(fine) {
    const res = await fetch(`${API_BASE}/library/fines`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(fine),
    });
    return res.json();
  },
  async payLibraryFine(id) {
    const res = await fetch(`${API_BASE}/library/fines/${id}/pay`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= SALON SERVICES =============
  async getSalonAppointments() {
    const res = await fetch(`${API_BASE}/salon/appointments`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addSalonAppointment(appointment) {
    const res = await fetch(`${API_BASE}/salon/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(appointment),
    });
    return res.json();
  },
  async completeSalonAppointment(id) {
    const res = await fetch(`${API_BASE}/salon/appointments/${id}/complete`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  async deleteSalonAppointment(id) {
    const res = await fetch(`${API_BASE}/salon/appointments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= SPORTS FACILITIES =============
  async getSportsBookings() {
    const res = await fetch(`${API_BASE}/sports/bookings`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addSportsBooking(booking) {
    const res = await fetch(`${API_BASE}/sports/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(booking),
    });
    return res.json();
  },
  async deleteSportsBooking(id) {
    const res = await fetch(`${API_BASE}/sports/bookings/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= CAFETERIA / CANTEEN =============
  async getCafeteriaOrders() {
    const res = await fetch(`${API_BASE}/cafeteria/orders`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addCafeteriaOrder(order) {
    const res = await fetch(`${API_BASE}/cafeteria/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(order),
    });
    return res.json();
  },
  async markCafeteriaOrderReady(id) {
    const res = await fetch(`${API_BASE}/cafeteria/orders/${id}/ready`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ============= TRANSPORTATION =============
  async getTransportRoutes() {
    const res = await fetch(`${API_BASE}/transport/routes`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addTransportRoute(route) {
    const res = await fetch(`${API_BASE}/transport/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(route),
    });
    return res.json();
  },
  async getTransportPasses() {
    const res = await fetch(`${API_BASE}/transport/passes`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addTransportPass(pass) {
    const res = await fetch(`${API_BASE}/transport/passes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(pass),
    });
    return res.json();
  },

  // ============= HEALTH CENTER =============
  async getHealthRecords() {
    const res = await fetch(`${API_BASE}/health/records`, { headers: getAuthHeaders() });
    return res.json();
  },
  async addHealthRecord(record) {
    const res = await fetch(`${API_BASE}/health/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(record),
    });
    return res.json();
  },
};
