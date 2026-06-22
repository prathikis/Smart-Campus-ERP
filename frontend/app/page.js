"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient } from "./api-client";

export default function SmartCampusApp() {
  const router = useRouter();

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Navigation & Theme States
  const [activeView, setActiveView] = useState("dashboard");
  const [isSidebarActive, setIsSidebarActive] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Core Data States
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0,
    borrowedBooks: 0,
    pendingAdmissions: 0,
    unreadNotifications: 0
  });

  // Notification & Announcement States
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDeptFilter, setStudentDeptFilter] = useState("All");

  const [facultySearch, setFacultySearch] = useState("");
  const [facultyDeptFilter, setFacultyDeptFilter] = useState("All");

  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("All");

  // Attendance Tracker States
  const [attendanceDept, setAttendanceDept] = useState("Computer Science");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceRoster, setAttendanceRoster] = useState([]);

  // Results View States
  const [selectedResultStudentId, setSelectedResultStudentId] = useState("");

  // Modal Dialog Form States
  const [modalActive, setModalActive] = useState(null);
  const [studentFormMode, setStudentFormMode] = useState("create");
  const [studentFormId, setStudentFormId] = useState("");
  const [studentForm, setStudentForm] = useState({
    name: "", rollNo: "", department: "Computer Science", email: "", attendance: 100, gpa: 8.5
  });
  
  const [facultyForm, setFacultyForm] = useState({
    id: "", name: "", department: "Computer Science", designation: "", email: "", status: "Active"
  });

  const [gradesForm, setGradesForm] = useState({
    studentId: "", dsa: 85, dbms: 78, web: 90, os: 82
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: "", feeCategory: "Tuition Fee", amount: 25000, paymentMode: "UPI / Net Banking"
  });

  const [bookForm, setBookForm] = useState({
    title: "", author: "", isbn: "", status: "Available"
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "", message: "", priority: "normal"
  });

  // --- AUTH CHECK ON MOUNT ---
  useEffect(() => {
    if (!ApiClient.isLoggedIn()) {
      router.push("/login");
      return;
    }
    const storedUser = ApiClient.getStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setAuthChecked(true);
    } else {
      router.push("/login");
    }
  }, [router]);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    if (!authChecked) return;

    // Check initial theme preference
    const savedTheme = localStorage.getItem("campus_theme");
    if (savedTheme === "dark") {
      setIsDarkTheme(true);
      document.body.classList.add("dark-theme");
    }
    
    // Set default attendance date to today
    setAttendanceDate(new Date().toISOString().split("T")[0]);

    fetchAllData();
  }, [authChecked]);

  async function fetchAllData() {
    try {
      setLoading(true);
      const [stList, facList, bList, txnList, actList, anData, notifList, annList, admList] = await Promise.all([
        ApiClient.getStudents(),
        ApiClient.getFaculty(),
        ApiClient.getBooks(),
        ApiClient.getTransactions(),
        ApiClient.getActivities(),
        ApiClient.getAnalytics(),
        ApiClient.getNotifications(currentUser?.role || "admin"),
        ApiClient.getAnnouncements(),
        ApiClient.getAdmissions()
      ]);
      setStudents(stList);
      setFaculty(facList);
      setBooks(bList);
      setTransactions(txnList);
      setActivities(actList);
      setAnalytics(anData);
      setNotifications(notifList);
      setAnnouncements(annList);
      setPendingAdmissions(admList);

      if (stList.length > 0) {
        setSelectedResultStudentId(stList[0].id);
      }
    } catch (err) {
      showToast("Failed to fetch records from backend server. Make sure it is running on port 5000.", "danger");
    } finally {
      setLoading(false);
    }
  }

  // --- LOGOUT ---
  async function handleLogout() {
    await ApiClient.logout();
    router.push("/login");
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = "success") {
    const id = Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }

  // --- CONFIRM DIALOG (replaces browser confirm()) ---
  function showConfirm(message, onConfirm) {
    setConfirmDialog({ message, onConfirm });
  }

  function handleConfirmYes() {
    if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog(null);
  }

  // Toggle Theme
  function handleThemeToggle() {
    const nextTheme = !isDarkTheme;
    setIsDarkTheme(nextTheme);
    if (nextTheme) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("campus_theme", "dark");
      showToast("Switched to dark theme", "info");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("campus_theme", "light");
      showToast("Switched to light theme", "info");
    }
  }

  // --- ROLE-BASED SIDEBAR MENU ---
  function getSidebarMenu() {
    const allMenus = [
      { id: "dashboard", label: "Dashboard", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z", roles: ["admin", "faculty", "student", "parent"] },
      { id: "students", label: "Students", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", roles: ["admin", "faculty"] },
      { id: "faculty", label: "Faculty", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2h-3a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3z", roles: ["admin"] },
      { id: "attendance", label: "Attendance", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", roles: ["admin", "faculty"] },
      { id: "results", label: "Exams & Results", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", roles: ["admin", "faculty", "student", "parent"] },
      { id: "finance", label: "Finance & Fees", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1m4-12h4a2 2 0 012 2v10a2 2 0 01-2 2h-4M4 16H3a2 2 0 01-2-2V6a2 2 0 012-2h1m4 4H4m0 0h12", roles: ["admin", "student", "parent"] },
      { id: "library", label: "Library", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", roles: ["admin", "faculty", "student"] },
      { id: "admissions", label: "Admissions", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", roles: ["admin"] },
      { id: "announcements", label: "Announcements", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z", roles: ["admin", "faculty", "student", "parent"] },
      { id: "ai-analytics", label: "AI Insights", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", roles: ["admin"] }
    ];
    const role = currentUser?.role || "admin";
    return allMenus.filter(m => m.roles.includes(role));
  }

  // --- STUDENT OPERATION CRUD ---
  async function handleStudentSubmit(e) {
    e.preventDefault();
    try {
      if (studentFormMode === "create") {
        await ApiClient.addStudent(studentForm);
        showToast(`Student ${studentForm.name} enrolled successfully!`);
      } else {
        await ApiClient.updateStudent(studentFormId, studentForm);
        showToast("Student profile updated!");
      }
      setModalActive(null);
      fetchAllData();
    } catch (err) {
      showToast("Failed to save student profile.", "danger");
    }
  }

  function openCreateStudent() {
    setStudentFormMode("create");
    setStudentFormId("");
    setStudentForm({
      name: "", rollNo: "", department: "Computer Science", email: "", attendance: 100, gpa: 8.5
    });
    setModalActive("student");
  }

  function openEditStudent(student) {
    setStudentFormMode("edit");
    setStudentFormId(student.id);
    setStudentForm({
      name: student.name,
      rollNo: student.rollNo,
      department: student.department,
      email: student.email,
      attendance: student.attendance,
      gpa: student.gpa
    });
    setModalActive("student");
  }

  async function handleDeleteStudent(id, name) {
    showConfirm(`Are you sure you want to delete profile for ${name}?`, async () => {
      try {
        await ApiClient.deleteStudent(id);
        showToast(`Deleted profile for ${name}`, "danger");
        fetchAllData();
      } catch (err) {
        showToast("Failed to delete student profile.", "danger");
      }
    });
  }

  // --- FACULTY OPERATIONS ---
  async function handleFacultySubmit(e) {
    e.preventDefault();
    try {
      await ApiClient.addFaculty(facultyForm);
      showToast(`Faculty member ${facultyForm.name} added!`);
      setModalActive(null);
      fetchAllData();
    } catch (err) {
      showToast("Failed to save faculty member.", "danger");
    }
  }

  function openAddFaculty() {
    setFacultyForm({
      id: `FAC-${Math.floor(500 + Math.random() * 500)}`,
      name: "",
      department: "Computer Science",
      designation: "",
      email: "",
      status: "Active"
    });
    setModalActive("faculty");
  }

  async function handleDeleteFaculty(id, name) {
    showConfirm(`Remove ${name} from institutional roster?`, async () => {
      try {
        await ApiClient.deleteFaculty(id);
        showToast(`Removed faculty ${name}`, "danger");
        fetchAllData();
      } catch (err) {
        showToast("Failed to remove faculty member.", "danger");
      }
    });
  }

  // --- ATTENDANCE OPERATIONS ---
  useEffect(() => {
    const roster = students
      .filter(s => s.department === attendanceDept)
      .map(s => ({
        id: s.id,
        name: s.name,
        rollNo: s.rollNo,
        present: true
      }));
    setAttendanceRoster(roster);
  }, [attendanceDept, students]);

  function handleAttendanceToggle(idx, present) {
    setAttendanceRoster(prev => {
      const copy = [...prev];
      copy[idx].present = present;
      return copy;
    });
  }

  async function saveAttendanceState() {
    if (attendanceRoster.length === 0) {
      showToast("No roster to save!", "warning");
      return;
    }
    try {
      await Promise.all(attendanceRoster.map(row => {
        const stud = students.find(s => s.id === row.id);
        if (stud) {
          const currentVal = stud.attendance;
          const nextVal = row.present
            ? Math.min(100, Math.round(currentVal * 0.95 + 5))
            : Math.max(0, Math.round(currentVal * 0.95));
          return ApiClient.updateStudent(row.id, { attendance: nextVal });
        }
        return Promise.resolve();
      }));
      showToast(`Attendance filed for ${attendanceDept} on ${attendanceDate}!`);
      fetchAllData();
    } catch (err) {
      showToast("Failed to save attendance roster.", "danger");
    }
  }

  function handleMarkAllPresent() {
    setAttendanceRoster(prev => prev.map(r => ({ ...r, present: true })));
  }

  // --- GRADING OPERATIONS ---
  async function handleGradesSubmit(e) {
    e.preventDefault();
    const stId = gradesForm.studentId || selectedResultStudentId;
    const target = students.find(s => s.id === stId);
    if (!target) return;

    try {
      const dsa = parseInt(gradesForm.dsa);
      const dbms = parseInt(gradesForm.dbms);
      const web = parseInt(gradesForm.web);
      const os = parseInt(gradesForm.os);
      const avg = (dsa + dbms + web + os) / 4;
      const gpa = Number((avg / 10).toFixed(2));

      const updatedTrends = [...(target.gradeTrends || [])];
      updatedTrends.push(gpa);
      if (updatedTrends.length > 5) updatedTrends.shift();

      await ApiClient.updateStudent(stId, {
        subjects: { dsa, dbms, web, os },
        gpa,
        gradeTrends: updatedTrends
      });

      showToast(`Semester marks updated for ${target.name}`);
      setModalActive(null);
      fetchAllData();
    } catch (err) {
      showToast("Failed to record semester marks.", "danger");
    }
  }

  function openGradesModal() {
    setGradesForm({
      studentId: selectedResultStudentId,
      dsa: 85,
      dbms: 80,
      web: 90,
      os: 82
    });
    setModalActive("grades");
  }

  // --- FINANCE OPERATIONS ---
  async function handlePaymentSubmit(e) {
    e.preventDefault();
    const stId = paymentForm.studentId || (students[0] && students[0].id);
    const target = students.find(s => s.id === stId);
    if (!target) return;

    try {
      await ApiClient.addTransaction({
        studentName: target.name,
        rollNo: target.rollNo,
        feeCategory: paymentForm.feeCategory,
        amount: parseInt(paymentForm.amount),
        paymentMode: paymentForm.paymentMode
      });

      showToast(`Recorded payment of ₹${parseInt(paymentForm.amount).toLocaleString("en-IN")} for ${target.name}`);
      setModalActive(null);
      fetchAllData();
    } catch (err) {
      showToast("Failed to process transaction receipt.", "danger");
    }
  }

  function openPaymentModal() {
    setPaymentForm({
      studentId: students[0] ? students[0].id : "",
      feeCategory: "Tuition Fee",
      amount: 25000,
      paymentMode: "UPI / Net Banking"
    });
    setModalActive("payment");
  }

  // --- LIBRARY OPERATIONS ---
  async function handleBookSubmit(e) {
    e.preventDefault();
    try {
      await ApiClient.addBook(bookForm);
      showToast(`Book '${bookForm.title}' added to library catalog!`);
      setModalActive(null);
      fetchAllData();
    } catch (err) {
      showToast("Failed to catalog new book.", "danger");
    }
  }

  function openAddBookModal() {
    setBookForm({
      title: "", author: "", isbn: "", status: "Available"
    });
    setModalActive("book");
  }

  async function handleBorrowBook(isbn) {
    const studentNames = students.map(s => s.name);
    const name = prompt(`Enter borrower name:\nOptions: ${studentNames.join(", ")}`);
    if (name) {
      try {
        await ApiClient.borrowBook(isbn, name);
        showToast(`Book lent to ${name}`);
        fetchAllData();
      } catch (err) {
        showToast("Failed to check out catalog book.", "danger");
      }
    }
  }

  async function handleReturnBook(isbn) {
    try {
      await ApiClient.returnBook(isbn);
      showToast("Book return recorded!");
      fetchAllData();
    } catch (err) {
      showToast("Failed to register book return.", "danger");
    }
  }

  // --- NOTIFICATION OPERATIONS ---
  async function handleMarkAllRead() {
    await ApiClient.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("All notifications marked as read", "info");
  }

  // --- ANNOUNCEMENT OPERATIONS ---
  async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    try {
      await ApiClient.addAnnouncement({ ...announcementForm, author: currentUser?.name || "Admin" });
      showToast("Announcement published!");
      setModalActive(null);
      setAnnouncementForm({ title: "", message: "", priority: "normal" });
      fetchAllData();
    } catch (err) {
      showToast("Failed to publish announcement.", "danger");
    }
  }

  // --- ADMISSION OPERATIONS ---
  async function handleApproveAdmission(id, name) {
    showConfirm(`Approve admission for ${name}? This will create a student account.`, async () => {
      try {
        await ApiClient.approveAdmission(id);
        showToast(`Admission approved for ${name}! Student account created.`);
        fetchAllData();
      } catch (err) {
        showToast("Failed to approve admission.", "danger");
      }
    });
  }

  async function handleRejectAdmission(id, name) {
    showConfirm(`Reject admission for ${name}? This action cannot be undone.`, async () => {
      try {
        await ApiClient.rejectAdmission(id);
        showToast(`Admission rejected for ${name}.`, "danger");
        fetchAllData();
      } catch (err) {
        showToast("Failed to reject admission.", "danger");
      }
    });
  }

  // Simulated Alert Notifications (no more browser alerts)
  function triggerEmailAlert(name, email) {
    showToast(`Remedial alert email sent to ${name} at ${email}`, "info");
  }

  function triggerSmsAlert(name) {
    showToast(`SMS alert sent to guardian of ${name}`, "info");
  }

  // --- DYNAMIC SVG CHART GENERATORS ---

  function renderEnrollmentChart() {
    const depts = ["MCA", "Computer Science", "Electronics", "Civil Engineering", "Mechanical"];
    const counts = depts.map(d => students.filter(s => s.department === d).length);
    const maxCount = Math.max(...counts, 4);

    const axisColor = isDarkTheme ? "#4b5563" : "#cbd5e1";
    const labelColor = isDarkTheme ? "#9ca3af" : "#475569";
    const barColor = "#6366f1";

    const widthPerBar = 50;
    const spacing = 35;
    const startX = 75;

    return (
      <svg className="chart-svg" width="100%" height="240" viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg">
        <line x1="50" y1="40" x2="480" y2="40" stroke={axisColor} strokeDasharray="4,4" />
        <line x1="50" y1="110" x2="480" y2="110" stroke={axisColor} strokeDasharray="4,4" />
        <line x1="50" y1="180" x2="480" y2="180" stroke={axisColor} strokeDasharray="4,4" />
        
        <line x1="50" y1="180" x2="480" y2="180" stroke={axisColor} strokeWidth="2" />
        <line x1="50" y1="20" x2="50" y2="180" stroke={axisColor} strokeWidth="2" />

        {depts.map((dept, i) => {
          const count = counts[i];
          const barHeight = (count / maxCount) * 140;
          const y = 180 - barHeight;
          const x = startX + i * (widthPerBar + spacing);

          return (
            <g key={dept}>
              <rect
                className="chart-bar"
                x={x}
                y={y}
                width={widthPerBar}
                height={barHeight}
                fill={barColor}
                rx="4"
              />
              <text x={x + widthPerBar / 2} y="202" fill={labelColor} fontSize="10" fontWeight="600" textAnchor="middle">
                {dept === "Computer Science" ? "Comp Sci" : dept === "Civil Engineering" ? "Civil" : dept}
              </text>
              <text x={x + widthPerBar / 2} y={y - 6} fill={labelColor} fontSize="9" fontWeight="700" textAnchor="middle">
                {count}
              </text>
            </g>
          );
        })}

        <text x="45" y="44" fill={labelColor} fontSize="10" fontWeight="600" textAnchor="end">{maxCount}</text>
        <text x="45" y="114" fill={labelColor} fontSize="10" fontWeight="600" textAnchor="end">{Math.round(maxCount / 2)}</text>
        <text x="45" y="184" fill={labelColor} fontSize="10" fontWeight="600" textAnchor="end">0</text>
      </svg>
    );
  }

  function renderGpaTrendChart(selectedStudent) {
    if (!selectedStudent || !selectedStudent.gradeTrends) {
      return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No data points.</p>;
    }
    const trends = selectedStudent.gradeTrends;
    const pointsCount = trends.length;
    if (pointsCount === 0) return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No trend entries.</p>;

    const lineColor = "#6366f1";
    const axisColor = isDarkTheme ? "#4b5563" : "#cbd5e1";
    const labelColor = isDarkTheme ? "#9ca3af" : "#475569";

    const height = 140;
    const width = 360;
    const padding = 20;

    let pathD = "";
    const nodes = [];

    trends.forEach((val, i) => {
      const x = padding + (i / (pointsCount - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - 4) / 6) * (height - 2 * padding);
      
      if (i === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
      nodes.push({ x, y, val });
    });

    return (
      <svg width="100%" height="160" viewBox="0 0 380 160" xmlns="http://www.w3.org/2000/svg">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={axisColor} strokeWidth="1.5" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={axisColor} strokeWidth="1.5" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={axisColor} strokeDasharray="3,3" />

        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="4" fill={lineColor} />
            <text x={n.x} y={n.y - 8} fontSize="8" fontWeight="700" fill={labelColor} textAnchor="middle">{n.val}</text>
          </g>
        ))}

        <text x={padding} y={height - 2} fill={labelColor} fontSize="8" fontWeight="600">Sem 1</text>
        <text x={width / 2} y={height - 2} fill={labelColor} fontSize="8" fontWeight="600" textAnchor="middle">Sem 2-3</text>
        <text x={width - padding} y={height - 2} fill={labelColor} fontSize="8" fontWeight="600" textAnchor="end">Sem 4 (Latest)</text>
      </svg>
    );
  }

  function renderAvgGpaChart() {
    const depts = ["MCA", "Computer Science", "Electronics", "Civil Engineering"];
    const avgGPAs = depts.map(d => {
      const deptStudents = students.filter(s => s.department === d);
      if (deptStudents.length === 0) return 0;
      const sum = deptStudents.reduce((acc, s) => acc + s.gpa, 0);
      return Number((sum / deptStudents.length).toFixed(2));
    });

    const axisColor = isDarkTheme ? "#4b5563" : "#cbd5e1";
    const labelColor = isDarkTheme ? "#9ca3af" : "#475569";
    const barColor = "#0ea5e9";

    const widthPerBar = 40;
    const spacing = 50;
    const startX = 80;

    return (
      <svg className="chart-svg" width="100%" height="200" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
        <line x1="50" y1="150" x2="480" y2="150" stroke={axisColor} strokeWidth="1.5" />
        <line x1="50" y1="20" x2="50" y2="150" stroke={axisColor} strokeWidth="1.5" />
        
        <line x1="50" y1="20" x2="480" y2="20" stroke={axisColor} strokeDasharray="3,3" />
        <line x1="50" y1="85" x2="480" y2="85" stroke={axisColor} strokeDasharray="3,3" />

        {depts.map((dept, i) => {
          const gpa = avgGPAs[i];
          const barHeight = (gpa / 10) * 130;
          const y = 150 - barHeight;
          const x = startX + i * (widthPerBar + spacing);

          return (
            <g key={dept}>
              <rect className="chart-bar" x={x} y={y} width={widthPerBar} height={barHeight} fill={barColor} rx="3" />
              <text x={x + widthPerBar / 2} y={y - 6} fill={labelColor} fontSize="9" fontWeight="700" textAnchor="middle">{gpa}</text>
              <text x={x + widthPerBar / 2} y="168" fill={labelColor} fontSize="9" fontWeight="600" textAnchor="middle">
                {dept === "Computer Science" ? "Comp Sci" : dept === "Civil Engineering" ? "Civil" : dept}
              </text>
            </g>
          );
        })}

        <text x="40" y="24" fill={labelColor} fontSize="9" fontWeight="600" textAnchor="end">10.0</text>
        <text x="40" y="89" fill={labelColor} fontSize="9" fontWeight="600" textAnchor="end">5.0</text>
        <text x="40" y="154" fill={labelColor} fontSize="9" fontWeight="600" textAnchor="end">0</text>
      </svg>
    );
  }

  // --- SUBPAGE COMPILER DIRECTIVES ---
  const activeStudent = students.find(s => s.id === selectedResultStudentId);
  const lowGpaRiskList = students.filter(s => s.gpa < 7.0);
  const lowAttendanceRiskList = students.filter(s => s.attendance < 75);

  const activeRosterTotal = attendanceRoster.length;
  const activeRosterPresent = attendanceRoster.filter(r => r.present).length;
  const activeRosterAbsent = activeRosterTotal - activeRosterPresent;
  const activeRosterRatio = activeRosterTotal > 0 ? Math.round((activeRosterPresent / activeRosterTotal) * 100) : 0;

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // For student/parent self-service — find the matching student record
  const myStudentRecord = currentUser?.role === "student"
    ? students.find(s => s.id === currentUser.studentId)
    : currentUser?.role === "parent"
    ? students.find(s => s.id === currentUser.childStudentId)
    : null;

  // If auth is not checked yet, show loading skeleton
  if (!authChecked) {
    return (
      <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="skeleton-loader">
          <div className="skeleton-bar" style={{ width: "200px", height: "24px", marginBottom: "12px" }}></div>
          <div className="skeleton-bar" style={{ width: "160px", height: "16px" }}></div>
        </div>
      </div>
    );
  }

  const roleLabel = { admin: "Administrator", faculty: "Faculty", student: "Student", parent: "Parent" };

  return (
    <div className="app-container">
      
      {/* Toast Alert Center */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="modal-overlay active" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3>Confirm Action</h3>
              <button className="modal-close-btn" onClick={() => setConfirmDialog(null)}>&times;</button>
            </div>
            <div style={{ padding: "20px", color: "var(--text-primary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
              {confirmDialog.message}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmYes}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar navigation */}
      <aside className={`sidebar ${isSidebarActive ? "active" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9L12 15L21 10L21 17H23V9L12 3Z"/>
              <path d="M5 12.5V17C5 18.1 8.14 19 12 19C15.86 19 19 18.1 19 17V12.5L12 16.5L5 12.5Z"/>
            </svg>
            <span>SmartCampus</span>
          </div>
        </div>

        {/* Role badge */}
        <div className="role-badge-sidebar">
          <span className={`role-badge-pill role-${currentUser?.role}`}>
            {currentUser?.role === "admin" && "🛡️"}
            {currentUser?.role === "faculty" && "🎓"}
            {currentUser?.role === "student" && "📚"}
            {currentUser?.role === "parent" && "👨‍👩‍👧"}
            {" "}{roleLabel[currentUser?.role] || "User"}
          </span>
        </div>

        <nav className="sidebar-menu">
          {getSidebarMenu().map(menu => (
            <div key={menu.id} className={`menu-item ${activeView === menu.id ? "active" : ""}`}>
              <button onClick={() => setActiveView(menu.id)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menu.icon} />
                </svg>
                <span>{menu.label}</span>
                {menu.id === "admissions" && analytics.pendingAdmissions > 0 && (
                  <span className="sidebar-badge">{analytics.pendingAdmissions}</span>
                )}
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{currentUser?.avatar || "?"}</div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name || "User"}</span>
            <span className="user-role">{roleLabel[currentUser?.role] || "Guest"}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main panel container */}
      <main className="main-content">
        
        {/* Top bar header */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="mobile-nav-toggle" onClick={() => setIsSidebarActive(!isSidebarActive)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="page-title">
              <h1 style={{ textTransform: "capitalize" }}>
                {activeView === "ai-analytics" ? "AI Insights Engine" : activeView}
              </h1>
            </div>
          </div>

          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={handleThemeToggle}>
              <svg className="moon-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg className="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="notif-dropdown-wrapper">
              <button className="notification-btn" onClick={() => setShowNotifPanel(!showNotifPanel)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifCount > 0 && <span className="notification-badge">{unreadNotifCount}</span>}
              </button>

              {showNotifPanel && (
                <div className="notif-dropdown-panel">
                  <div className="notif-dropdown-header">
                    <h4>Notifications</h4>
                    {unreadNotifCount > 0 && (
                      <button className="notif-mark-read" onClick={handleMarkAllRead}>Mark all read</button>
                    )}
                  </div>
                  <div className="notif-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`} onClick={async () => {
                          if (!n.read) {
                            await ApiClient.markNotificationRead(n.id);
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                          }
                        }}>
                          <div className={`notif-dot ${n.type}`}></div>
                          <div className="notif-content">
                            <span className="notif-title">{n.title}</span>
                            <span className="notif-message">{n.message}</span>
                            <span className="notif-time">{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View switching panel wrapper */}
        {loading ? (
          <div className="skeleton-loader" style={{ padding: "40px" }}>
            <div className="skeleton-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-bar" style={{ width: "60%", height: "14px", marginBottom: "8px" }}></div>
                  <div className="skeleton-bar" style={{ width: "40%", height: "24px", marginBottom: "8px" }}></div>
                  <div className="skeleton-bar" style={{ width: "50%", height: "12px" }}></div>
                </div>
              ))}
            </div>
            <div className="skeleton-bar" style={{ width: "100%", height: "200px", marginTop: "24px", borderRadius: "12px" }}></div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            
            {/* 1. DASHBOARD VIEW */}
            <section className={`view-section ${activeView === "dashboard" ? "active" : ""}`}>
              {/* Student Self-Service Dashboard */}
              {(currentUser?.role === "student" || currentUser?.role === "parent") && myStudentRecord ? (
                <div className="self-service-dash">
                  <div className="welcome-banner">
                    <div className="welcome-text">
                      <h2>Welcome back, {currentUser?.role === "parent" ? `${currentUser?.name} (Parent)` : myStudentRecord.name}!</h2>
                      <p>{currentUser?.role === "parent" ? `Viewing academic record for ${myStudentRecord.name}` : "Here's your academic overview"}</p>
                    </div>
                    <div className="welcome-avatar">
                      <div className="avatar-circle" style={{ width: "64px", height: "64px", fontSize: "1.5rem" }}>
                        {myStudentRecord.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-grid">
                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">My GPA</span>
                        <span className="metric-value" style={{ color: myStudentRecord.gpa >= 8.5 ? "var(--color-success)" : myStudentRecord.gpa >= 7.0 ? "var(--color-brand)" : "var(--color-danger)" }}>{myStudentRecord.gpa.toFixed(2)}</span>
                        <span className="metric-trend up">{myStudentRecord.gpa >= 8.5 ? "Excellent" : myStudentRecord.gpa >= 7.0 ? "Good Standing" : "Needs Improvement"}</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Attendance</span>
                        <span className="metric-value" style={{ color: myStudentRecord.attendance >= 85 ? "var(--color-success)" : myStudentRecord.attendance >= 75 ? "var(--color-warning)" : "var(--color-danger)" }}>{myStudentRecord.attendance}%</span>
                        <span className={`metric-trend ${myStudentRecord.attendance >= 75 ? "up" : "down"}`}>{myStudentRecord.attendance >= 75 ? "Above threshold" : "Below 75% ⚠️"}</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Department</span>
                        <span className="metric-value" style={{ fontSize: "1.2rem" }}>{myStudentRecord.department}</span>
                        <span className="metric-trend up">{myStudentRecord.rollNo}</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Class Rank</span>
                        <span className="metric-value">#{students.filter(st => st.gpa > myStudentRecord.gpa).length + 1}</span>
                        <span className="metric-trend up">of {students.length} students</span>
                      </div>
                    </div>
                  </div>

                  <div className="visualizations">
                    <div className="chart-panel">
                      <div className="panel-header">
                        <h2>My GPA Trend</h2>
                      </div>
                      <div className="chart-container" style={{ minHeight: "180px" }}>
                        {renderGpaTrendChart(myStudentRecord)}
                      </div>
                    </div>

                    <div className="chart-panel">
                      <div className="panel-header">
                        <h2>Subject Scores</h2>
                      </div>
                      <div style={{ padding: "16px" }}>
                        {myStudentRecord.subjects && Object.entries(myStudentRecord.subjects).map(([sub, score]) => (
                          <div key={sub} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <span style={{ width: "60px", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{sub}</span>
                            <div style={{ flex: 1, height: "8px", background: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ width: `${score}%`, height: "100%", background: score >= 85 ? "var(--color-success)" : score >= 70 ? "var(--color-brand)" : "var(--color-danger)", borderRadius: "4px", transition: "width 0.5s ease" }}></div>
                            </div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "40px" }}>{score}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Admin/Faculty Dashboard */
                <>
                  <div className="dashboard-grid">
                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Total Students</span>
                        <span className="metric-value">{analytics.totalStudents}</span>
                        <span className="metric-trend up">12% growth</span>
                      </div>
                      <div className="metric-icon-container">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Faculty Members</span>
                        <span className="metric-value">{analytics.totalFaculty}</span>
                        <span className="metric-trend up">Active 98%</span>
                      </div>
                      <div className="metric-icon-container">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Fee Collection</span>
                        <span className="metric-value">₹{analytics.totalCollected.toLocaleString("en-IN")}</span>
                        <span className="metric-trend up">Outstanding: ₹{analytics.outstanding.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="metric-icon-container">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-6 4h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-info">
                        <span className="metric-title">Library Borrowed</span>
                        <span className="metric-value">{analytics.borrowedBooks}</span>
                        <span className="metric-trend down">In circulation</span>
                      </div>
                      <div className="metric-icon-container">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="visualizations">
                    <div className="chart-panel">
                      <div className="panel-header">
                        <h2>Department-wise Performance & Enrollment</h2>
                      </div>
                      <div className="chart-container">
                        {renderEnrollmentChart()}
                      </div>
                    </div>

                    <div className="activity-panel">
                      <div className="panel-header">
                        <h2>Recent Campus Activities</h2>
                      </div>
                      <div className="activity-feed">
                        {activities.map((act, i) => (
                          <div key={i} className="activity-item">
                            <div className={`activity-icon ${act.icon}`}>
                              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" />
                              </svg>
                            </div>
                            <div className="activity-details">
                              <span className="activity-text">{act.text}</span>
                              <span className="activity-time">{act.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* 2. STUDENTS VIEW */}
            <section className={`view-section ${activeView === "students" ? "active" : ""}`}>
              <div className="page-actions-row">
                <div className="search-filter-box">
                  <div className="search-input-wrapper">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      className="search-control"
                      placeholder="Search student directories..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </div>
                  <select className="select-control" value={studentDeptFilter} onChange={e => setStudentDeptFilter(e.target.value)}>
                    <option value="All">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="MCA">MCA</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
                {currentUser?.role === "admin" && (
                  <button className="btn btn-primary" onClick={openCreateStudent}>Add Student</button>
                )}
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Department</th>
                      <th>Email</th>
                      <th>Attendance</th>
                      <th>GPA</th>
                      {currentUser?.role === "admin" && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(s => {
                        const mSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNo.toLowerCase().includes(studentSearch.toLowerCase());
                        const mDept = studentDeptFilter === "All" || s.department === studentDeptFilter;
                        return mSearch && mDept;
                      })
                      .map(s => (
                        <tr key={s.id}>
                          <td>
                            <div className="avatar-cell">
                              <div className="avatar-circle">{s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{s.rollNo}</td>
                          <td>{s.department}</td>
                          <td>{s.email}</td>
                          <td>
                            <span className={`badge ${s.attendance >= 85 ? "badge-success" : s.attendance >= 75 ? "badge-warning" : "badge-danger"}`}>
                              {s.attendance}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${s.gpa >= 8.5 ? "badge-success" : s.gpa >= 7.0 ? "badge-info" : "badge-danger"}`}>
                              {s.gpa.toFixed(2)}
                            </span>
                          </td>
                          {currentUser?.role === "admin" && (
                            <td>
                              <div className="table-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => openEditStudent(s)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(s.id, s.name)}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. FACULTY VIEW */}
            <section className={`view-section ${activeView === "faculty" ? "active" : ""}`}>
              <div className="page-actions-row">
                <div className="search-filter-box">
                  <div className="search-input-wrapper">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      className="search-control"
                      placeholder="Search faculty specializes..."
                      value={facultySearch}
                      onChange={e => setFacultySearch(e.target.value)}
                    />
                  </div>
                  <select className="select-control" value={facultyDeptFilter} onChange={e => setFacultyDeptFilter(e.target.value)}>
                    <option value="All">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="MCA">MCA</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={openAddFaculty}>Add Faculty</button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>ID</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculty
                      .filter(f => {
                        const mSearch = f.name.toLowerCase().includes(facultySearch.toLowerCase()) || f.designation.toLowerCase().includes(facultySearch.toLowerCase());
                        const mDept = facultyDeptFilter === "All" || f.department === facultyDeptFilter;
                        return mSearch && mDept;
                      })
                      .map(f => (
                        <tr key={f.id}>
                          <td>
                            <div className="avatar-cell">
                              <div className="avatar-circle" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "var(--color-success)" }}>
                                {f.name.replace("Dr. ", "").replace("Prof. ", "").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{f.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{f.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{f.id}</td>
                          <td>{f.department}</td>
                          <td>{f.designation}</td>
                          <td>{f.email}</td>
                          <td>
                            <span className={`badge ${f.status === "Active" ? "badge-success" : "badge-warning"}`}>{f.status}</span>
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFaculty(f.id, f.name)}>Remove</button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. ATTENDANCE VIEW */}
            <section className={`view-section ${activeView === "attendance" ? "active" : ""}`}>
              <div className="page-actions-row">
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <label className="form-label">Department</label>
                    <select className="select-control" value={attendanceDept} onChange={e => setAttendanceDept(e.target.value)}>
                      <option value="Computer Science">Computer Science</option>
                      <option value="MCA">MCA</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Electronics">Electronics</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input type="date" className="select-control" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignSelf: "flex-end" }}>
                  <button className="btn btn-secondary" onClick={handleMarkAllPresent}>Mark All Present</button>
                  <button className="btn btn-primary" onClick={saveAttendanceState}>Save Attendance</button>
                </div>
              </div>

              <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
                <div className="metric-card" style={{ padding: "16px 20px" }}>
                  <div className="metric-info" style={{ gap: "4px" }}>
                    <span className="metric-title" style={{ fontSize: "0.75rem" }}>Students Enrolled</span>
                    <span className="metric-value" style={{ fontSize: "1.5rem" }}>{activeRosterTotal}</span>
                  </div>
                </div>
                <div className="metric-card" style={{ padding: "16px 20px" }}>
                  <div className="metric-info" style={{ gap: "4px" }}>
                    <span className="metric-title" style={{ fontSize: "0.75rem" }}>Present</span>
                    <span className="metric-value" style={{ fontSize: "1.5rem", color: "var(--color-success)" }}>{activeRosterPresent}</span>
                  </div>
                </div>
                <div className="metric-card" style={{ padding: "16px 20px" }}>
                  <div className="metric-info" style={{ gap: "4px" }}>
                    <span className="metric-title" style={{ fontSize: "0.75rem" }}>Absent</span>
                    <span className="metric-value" style={{ fontSize: "1.5rem", color: "var(--color-danger)" }}>{activeRosterAbsent}</span>
                  </div>
                </div>
                <div className="metric-card" style={{ padding: "16px 20px" }}>
                  <div className="metric-info" style={{ gap: "4px" }}>
                    <span className="metric-title" style={{ fontSize: "0.75rem" }}>Ratio</span>
                    <span className="metric-value" style={{ fontSize: "1.5rem", color: "var(--color-brand)" }}>{activeRosterRatio}%</span>
                  </div>
                </div>
              </div>

              <div className="attendance-grid">
                {attendanceRoster.map((item, idx) => (
                  <div key={item.id} className="student-attendance-card">
                    <div className="avatar-cell">
                      <div className="avatar-circle">{item.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{item.rollNo}</div>
                      </div>
                    </div>
                    <div className="attendance-toggle">
                      <button className={`btn-toggle ${item.present ? "active-p" : ""}`} onClick={() => handleAttendanceToggle(idx, true)}>Present</button>
                      <button className={`btn-toggle ${!item.present ? "active-a" : ""}`} onClick={() => handleAttendanceToggle(idx, false)}>Absent</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. RESULTS VIEW */}
            <section className={`view-section ${activeView === "results" ? "active" : ""}`}>
              <div className="page-actions-row">
                <div className="search-filter-box">
                  <select className="select-control" value={selectedResultStudentId} onChange={e => setSelectedResultStudentId(e.target.value)}>
                    {(currentUser?.role === "student" || currentUser?.role === "parent"
                      ? students.filter(s => s.id === (currentUser?.studentId || currentUser?.childStudentId))
                      : students
                    ).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>
                    ))}
                  </select>
                </div>
                {(currentUser?.role === "admin" || currentUser?.role === "faculty") && (
                  <button className="btn btn-primary" onClick={openGradesModal}>Record Semester Marks</button>
                )}
              </div>

              {activeStudent && (
                <div className="payment-grid">
                  <div className="chart-panel" style={{ marginBottom: 0 }}>
                    <div className="panel-header" style={{ marginBottom: "12px" }}>
                      <h2>Performance Summary</h2>
                    </div>
                    <div className="transcript-card">
                      <div className="transcript-header">
                        <span style={{ fontWeight: 700 }}>{activeStudent.name}</span>
                        <span style={{ fontFamily: "monospace" }}>Rank #{students.filter(st => st.gpa > activeStudent.gpa).length + 1}</span>
                      </div>
                      <div className="transcript-grid">
                        <div><strong>Roll No:</strong> {activeStudent.rollNo}</div>
                        <div><strong>CGPA:</strong> <span style={{ color: "var(--color-brand)", fontWeight: 700 }}>{activeStudent.gpa.toFixed(2)}</span></div>
                        <div><strong>Attendance Ratio:</strong> {activeStudent.attendance}%</div>
                        <div><strong>Academic Standing:</strong> <span className={`badge ${activeStudent.gpa >= 6.0 ? "badge-success" : "badge-danger"}`}>{activeStudent.gpa >= 6.0 ? "Good Standing" : "Risk Code"}</span></div>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "12px" }}>GPA Trend Analytics</h3>
                      <div className="chart-container" style={{ minHeight: "180px" }}>
                        {renderGpaTrendChart(activeStudent)}
                      </div>
                    </div>
                  </div>

                  <div className="chart-panel" style={{ marginBottom: 0 }}>
                    <div className="panel-header">
                      <h2>Official Marks Transcript</h2>
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: "360px" }}>
                      <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--border-radius-md)", padding: "16px" }}>
                        <div className="transcript-grade"><span>Data Structures & Algo (DSA)</span> <strong>{activeStudent.subjects?.dsa || 0} / 100</strong></div>
                        <div className="transcript-grade" style={{ marginTop: "8px" }}><span>Database Management (DBMS)</span> <strong>{activeStudent.subjects?.dbms || 0} / 100</strong></div>
                        <div className="transcript-grade" style={{ marginTop: "8px" }}><span>Web Technologies</span> <strong>{activeStudent.subjects?.web || 0} / 100</strong></div>
                        <div className="transcript-grade" style={{ marginTop: "8px", borderBottom: "none" }}><span>Operating Systems (OS)</span> <strong>{activeStudent.subjects?.os || 0} / 100</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 6. FINANCE VIEW */}
            <section className={`view-section ${activeView === "finance" ? "active" : ""}`}>
              <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
                <div className="metric-card">
                  <div className="metric-info">
                    <span className="metric-title">Total Invoiced</span>
                    <span className="metric-value">₹{analytics.totalInvoiced.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-info">
                    <span className="metric-title">Total Collected</span>
                    <span className="metric-value" style={{ color: "var(--color-success)" }}>₹{analytics.totalCollected.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-info">
                    <span className="metric-title">Outstanding Balance</span>
                    <span className="metric-value" style={{ color: "var(--color-danger)" }}>₹{analytics.outstanding.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <div className="page-actions-row">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>Payment Ledger</h2>
                {currentUser?.role === "admin" && (
                  <button className="btn btn-primary" onClick={openPaymentModal}>Record Fee Payment</button>
                )}
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter(t => {
                        // Students/Parents see only their own transactions
                        if (currentUser?.role === "student") {
                          const myRecord = students.find(s => s.id === currentUser?.studentId);
                          return myRecord ? t.studentName === myRecord.name : true;
                        }
                        if (currentUser?.role === "parent") {
                          const childRecord = students.find(s => s.id === currentUser?.childStudentId);
                          return childRecord ? t.studentName === childRecord.name : true;
                        }
                        return true;
                      })
                      .map(t => (
                        <tr key={t.txnId}>
                          <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{t.txnId}</td>
                          <td>{t.studentName}</td>
                          <td style={{ fontFamily: "monospace" }}>{t.rollNo}</td>
                          <td>{t.feeCategory}</td>
                          <td style={{ fontWeight: 600 }}>₹{t.amount.toLocaleString("en-IN")}</td>
                          <td>{t.paymentMode}</td>
                          <td>{t.date}</td>
                          <td><span className="badge badge-success">{t.status || "Success"}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 7. LIBRARY VIEW */}
            <section className={`view-section ${activeView === "library" ? "active" : ""}`}>
              <div className="page-actions-row">
                <div className="search-filter-box">
                  <div className="search-input-wrapper">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      className="search-control"
                      placeholder="Search catalog titles..."
                      value={librarySearch}
                      onChange={e => setLibrarySearch(e.target.value)}
                    />
                  </div>
                  <select className="select-control" value={libraryFilter} onChange={e => setLibraryFilter(e.target.value)}>
                    <option value="All">All Books</option>
                    <option value="Available">Available</option>
                    <option value="Borrowed">Borrowed</option>
                  </select>
                </div>
                {currentUser?.role === "admin" && (
                  <button className="btn btn-primary" onClick={openAddBookModal}>Add Book</button>
                )}
              </div>

              <div className="library-grid">
                {books
                  .filter(b => {
                    const mSearch = b.title.toLowerCase().includes(librarySearch.toLowerCase()) || b.author.toLowerCase().includes(librarySearch.toLowerCase());
                    const mFilter = libraryFilter === "All" || b.status === libraryFilter;
                    return mSearch && mFilter;
                  })
                  .map(b => (
                    <div key={b.isbn} className="book-card">
                      <div className="book-cover">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" />
                        </svg>
                      </div>
                      <div className="book-details">
                        <div className="book-info">
                          <h4>{b.title}</h4>
                          <p>Author: {b.author}</p>
                          <p style={{ fontSize: "0.7rem" }}>ISBN: {b.isbn}</p>
                          {b.status === "Borrowed" && <p style={{ fontSize: "0.7rem", color: "var(--color-warning)", fontWeight: 600, marginTop: "4px" }}>Lent to: {b.borrowedBy}</p>}
                        </div>
                        <div className="book-footer">
                          <span className={`badge ${b.status === "Available" ? "badge-success" : "badge-warning"}`}>{b.status}</span>
                          {(currentUser?.role === "admin" || currentUser?.role === "faculty") && (
                            b.status === "Available" ? (
                              <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleBorrowBook(b.isbn)}>Borrow</button>
                            ) : (
                              <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleReturnBook(b.isbn)}>Return</button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </section>

            {/* 8. ADMISSIONS VIEW (Admin only) */}
            <section className={`view-section ${activeView === "admissions" ? "active" : ""}`}>
              <div className="page-actions-row">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>
                  Pending Admission Applications
                </h2>
              </div>

              {pendingAdmissions.filter(a => a.status === "pending").length === 0 ? (
                <div className="empty-state">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "48px", height: "48px", color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3>No Pending Applications</h3>
                  <p>All admission applications have been processed.</p>
                </div>
              ) : (
                <div className="admission-cards">
                  {pendingAdmissions.filter(a => a.status === "pending").map(a => (
                    <div key={a.id} className="admission-card">
                      <div className="admission-card-header">
                        <div className="avatar-cell">
                          <div className="avatar-circle">{a.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{a.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Applied: {a.appliedDate}</div>
                          </div>
                        </div>
                        <span className="badge badge-warning">Pending</span>
                      </div>
                      <div className="admission-card-details">
                        <div><strong>Email:</strong> {a.email}</div>
                        <div><strong>Phone:</strong> {a.phone}</div>
                        <div><strong>Department:</strong> {a.department}</div>
                        <div><strong>Guardian:</strong> {a.guardian}</div>
                      </div>
                      <div className="admission-card-actions">
                        <button className="btn btn-primary" onClick={() => handleApproveAdmission(a.id, a.name)}>
                          ✓ Approve & Enroll
                        </button>
                        <button className="btn btn-danger" onClick={() => handleRejectAdmission(a.id, a.name)}>
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingAdmissions.filter(a => a.status !== "pending").length > 0 && (
                <>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, marginTop: "32px", marginBottom: "16px", color: "var(--text-secondary)" }}>
                    Processed Applications
                  </h3>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr><th>Name</th><th>Department</th><th>Applied Date</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {pendingAdmissions.filter(a => a.status !== "pending").map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{a.name}</td>
                            <td>{a.department}</td>
                            <td>{a.appliedDate}</td>
                            <td>
                              <span className={`badge ${a.status === "approved" ? "badge-success" : "badge-danger"}`}>
                                {a.status === "approved" ? "Approved" : "Rejected"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* 9. ANNOUNCEMENTS VIEW */}
            <section className={`view-section ${activeView === "announcements" ? "active" : ""}`}>
              <div className="page-actions-row">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>Campus Announcements</h2>
                {currentUser?.role === "admin" && (
                  <button className="btn btn-primary" onClick={() => setModalActive("announcement")}>Publish Announcement</button>
                )}
              </div>

              <div className="announcements-list">
                {announcements.map(ann => (
                  <div key={ann.id} className={`announcement-card ${ann.priority === "high" ? "priority-high" : ""}`}>
                    <div className="announcement-header">
                      <h3>{ann.title}</h3>
                      <div className="announcement-meta">
                        <span className="announcement-date">{ann.date}</span>
                        {ann.priority === "high" && <span className="badge badge-danger">Important</span>}
                      </div>
                    </div>
                    <p className="announcement-body">{ann.message}</p>
                    <div className="announcement-footer">
                      <span>Published by: {ann.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 10. AI INSIGHTS VIEW */}
            <section className={`view-section ${activeView === "ai-analytics" ? "active" : ""}`}>
              <div className="ai-section">
                <div className="ai-header">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3>SmartCampus AI Insights & Predictive Engine</h3>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "24px" }}>
                  Analyzing classroom grade trends, flagging attendance risk profiles early, and mapping targeted library books to high performers.
                </p>

                <div className="ai-grid">
                  <div className="ai-card">
                    <h4 style={{ color: "var(--color-danger)" }}>Academic Risks (Low GPAs)</h4>
                    <ul>
                      {lowGpaRiskList.length === 0 ? <li>No students flagged for GPA warnings.</li> : (
                        lowGpaRiskList.map(s => (
                          <li key={s.id}>
                            <strong>{s.name} ({s.department})</strong> - GPA: {s.gpa}<br/>
                            <button className="btn btn-secondary" style={{ padding: "2px 8px", fontSize: "0.7rem", marginTop: "4px" }} onClick={() => triggerEmailAlert(s.name, s.email)}>Email Alert</button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div className="ai-card">
                    <h4 style={{ color: "var(--color-warning)" }}>Attendance Warnings (&lt; 75%)</h4>
                    <ul>
                      {lowAttendanceRiskList.length === 0 ? <li>All students meet standard attendance ratios.</li> : (
                        lowAttendanceRiskList.map(s => (
                          <li key={s.id}>
                            <strong>{s.name} ({s.department})</strong> - Attendance: {s.attendance}%<br/>
                            <button className="btn btn-secondary" style={{ padding: "2px 8px", fontSize: "0.7rem", marginTop: "4px" }} onClick={() => triggerSmsAlert(s.name)}>SMS Parents</button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div className="ai-card">
                    <h4 style={{ color: "var(--color-info)" }}>Smart Catalog Allocations</h4>
                    <ul>
                      {students.filter(s => s.gpa >= 8.5).slice(0, 3).map(s => (
                        <li key={s.id}>
                          Recommend <strong>DSA Study Guides</strong> to high-scorer <strong>{s.name}</strong> to support advanced projects.
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="chart-panel">
                <div className="panel-header">
                  <h2>Department Average GPA Performance</h2>
                </div>
                <div className="chart-container">
                  {renderAvgGpaChart()}
                </div>
              </div>
            </section>

          </div>
        )}
      </main>

      {/* --- DIALOG MODALS --- */}

      {/* A. STUDENT MODAL */}
      {modalActive === "student" && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{studentFormMode === "create" ? "Enroll New Student" : "Edit Student Profile"}</h3>
              <button className="modal-close-btn" onClick={() => setModalActive(null)}>&times;</button>
            </div>
            <form onSubmit={handleStudentSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" className="form-control" required
                  value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text" className="form-control" required
                    value={studentForm.rollNo} onChange={e => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-control" value={studentForm.department}
                    onChange={e => setStudentForm({ ...studentForm, department: e.target.value })}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="MCA">MCA</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email" className="form-control" required
                  value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Initial Attendance (%)</label>
                  <input
                    type="number" className="form-control" required min="0" max="100"
                    value={studentForm.attendance} onChange={e => setStudentForm({ ...studentForm, attendance: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial GPA</label>
                  <input
                    type="number" className="form-control" required min="0" max="10" step="0.01"
                    value={studentForm.gpa} onChange={e => setStudentForm({ ...studentForm, gpa: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. FACULTY MODAL */}
      {modalActive === "faculty" && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Faculty Member</h3>
              <button className="modal-close-btn" onClick={() => setModalActive(null)}>&times;</button>
            </div>
            <form onSubmit={handleFacultySubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" className="form-control" required
                  value={facultyForm.name} onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Faculty ID</label>
                  <input
                    type="text" className="form-control" required
                    value={facultyForm.id} onChange={e => setFacultyForm({ ...facultyForm, id: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-control" value={facultyForm.department}
                    onChange={e => setFacultyForm({ ...facultyForm, department: e.target.value })}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="MCA">MCA</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    type="text" className="form-control" required placeholder="e.g. Professor"
                    value={facultyForm.designation} onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control" value={facultyForm.status}
                    onChange={e => setFacultyForm({ ...facultyForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email" className="form-control" required
                  value={facultyForm.email} onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. GRADES MODAL */}
      {modalActive === "grades" && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Semester Marks</h3>
              <button className="modal-close-btn" onClick={() => setModalActive(null)}>&times;</button>
            </div>
            <form onSubmit={handleGradesSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data Structures (DSA)</label>
                  <input
                    type="number" className="form-control" required min="0" max="100"
                    value={gradesForm.dsa} onChange={e => setGradesForm({ ...gradesForm, dsa: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Database Management (DBMS)</label>
                  <input
                    type="number" className="form-control" required min="0" max="100"
                    value={gradesForm.dbms} onChange={e => setGradesForm({ ...gradesForm, dbms: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Web Technologies</label>
                  <input
                    type="number" className="form-control" required min="0" max="100"
                    value={gradesForm.web} onChange={e => setGradesForm({ ...gradesForm, web: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Systems</label>
                  <input
                    type="number" className="form-control" required min="0" max="100"
                    value={gradesForm.os} onChange={e => setGradesForm({ ...gradesForm, os: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Transcript</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. RECORD PAYMENT MODAL */}
      {modalActive === "payment" && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Fee Payment</h3>
              <button className="modal-close-btn" onClick={() => setModalActive(null)}>&times;</button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select
                  className="form-control" value={paymentForm.studentId}
                  onChange={e => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fee Category</label>
                  <select
                    className="form-control" value={paymentForm.feeCategory}
                    onChange={e => setPaymentForm({ ...paymentForm, feeCategory: e.target.value })}
                  >
                    <option value="Tuition Fee">Tuition Fee</option>
                    <option value="Exam Fee">Exam Fee</option>
                    <option value="Hostel & Mess Fee">Hostel & Mess Fee</option>
                    <option value="Library & Gym Fee">Library & Gym Fee</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input
                    type="number" className="form-control" required min="500" step="500"
                    value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select
                  className="form-control" value={paymentForm.paymentMode}
                  onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                >
                  <option value="UPI / Net Banking">UPI / Net Banking</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cash / Bank Challan">Cash / Bank Challan</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E. ADD BOOK MODAL */}
      {modalActive === "book" && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Catalog Book</h3>
              <button className="modal-close-btn" onClick={() => setModalActive(null)}>&times;</button>
            </div>
            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label className="form-label">Book Title</label>
                <input
                  type="text" className="form-control" required
                  value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Author(s)</label>
                <input
                  type="text" className="form-control" required
                  value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ISBN Code</label>
                  <input
                    type="text" className="form-control" required
                    value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control" value={bookForm.status}
                    onChange={e => setBookForm({ ...bookForm, status: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="Borrowed">Borrowed</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F. ANNOUNCEMENT MODAL */}
      {modalActive === "announcement" && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Publish Announcement</h3>
              <button className="modal-close-btn" onClick={() => setModalActive(null)}>&times;</button>
            </div>
            <form onSubmit={handleAnnouncementSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text" className="form-control" required
                  value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-control" required rows="4" style={{ resize: "vertical" }}
                  value={announcementForm.message} onChange={e => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-control" value={announcementForm.priority}
                  onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High (Important)</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
