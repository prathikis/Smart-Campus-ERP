const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();
const db = require("./db");

const app = express();
const PORT = 5000;

// In-memory session tokens
const sessions = {};

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to log activity to MySQL
async function logActivity(text, icon = "payment") {
  try {
    await db.query(
      "INSERT INTO activities (text, time, icon) VALUES (?, 'Just now', ?)",
      [text, icon]
    );
    // Limit to 8 recent entries to keep DB clean
    const [rows] = await db.query("SELECT id FROM activities ORDER BY id DESC LIMIT 1 OFFSET 8");
    if (rows.length > 0) {
      await db.query("DELETE FROM activities WHERE id <= ?", [rows[0].id]);
    }
  } catch (err) {
    console.error("Error logging activity to MySQL:", err);
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }
  const token = authHeader.split(" ")[1];
  const session = sessions[token];
  if (!session) {
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
  req.user = session;
  next();
}

// ============= AUTH ENDPOINTS =============

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password]);
    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");
    sessions[token] = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      department: user.department || null,
      studentId: user.studentId || null,
      childStudentId: user.childStudentId || null
    };
    
    await logActivity(`${user.name} logged in as ${user.role}`, "profile");
    
    res.json({
      token,
      user: sessions[token]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/logout", authMiddleware, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    delete sessions[token];
    res.json({ success: true, message: "Logged out successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============= STUDENT ENDPOINTS =============

app.get("/api/students", async (req, res) => {
  try {
    const [students] = await db.query("SELECT * FROM students");
    const parsed = students.map(s => ({
      ...s,
      gpa: parseFloat(s.gpa),
      attendance: parseInt(s.attendance),
      gradeTrends: typeof s.gradeTrends === "string" ? JSON.parse(s.gradeTrends) : s.gradeTrends,
      subjects: typeof s.subjects === "string" ? JSON.parse(s.subjects) : s.subjects
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const newStudent = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM students");
    const count = countResult[0].count;
    
    newStudent.id = `STU-${String(count + 1).padStart(3, "0")}`;
    if (!newStudent.gradeTrends) {
      newStudent.gradeTrends = [7.8, 8.0, 8.2, newStudent.gpa || 8.5];
    }
    if (!newStudent.subjects) {
      newStudent.subjects = { dsa: 80, dbms: 78, web: 82, os: 80 };
    }
    
    await db.query(
      "INSERT INTO students (id, name, rollNo, department, email, phone, guardian, guardianPhone, gender, dob, bloodGroup, address, attendance, gpa, gradeTrends, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        newStudent.id,
        newStudent.name,
        newStudent.rollNo,
        newStudent.department,
        newStudent.email,
        newStudent.phone,
        newStudent.guardian,
        newStudent.guardianPhone || null,
        newStudent.gender || null,
        newStudent.dob || null,
        newStudent.bloodGroup || null,
        newStudent.address || null,
        newStudent.attendance || 100,
        newStudent.gpa || 8.5,
        JSON.stringify(newStudent.gradeTrends),
        JSON.stringify(newStudent.subjects)
      ]
    );
    
    await logActivity(`New student ${newStudent.name} registered`, "profile");
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === "id") continue;
      fields.push(`\`${key}\` = ?`);
      if (key === "gradeTrends" || key === "subjects") {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
    
    if (fields.length > 0) {
      values.push(id);
      await db.query(`UPDATE students SET ${fields.join(", ")} WHERE id = ?`, values);
    }
    
    const [rows] = await db.query("SELECT * FROM students WHERE id = ?", [id]);
    if (rows.length > 0) {
      const s = rows[0];
      res.json({
        ...s,
        gpa: parseFloat(s.gpa),
        attendance: parseInt(s.attendance),
        gradeTrends: typeof s.gradeTrends === "string" ? JSON.parse(s.gradeTrends) : s.gradeTrends,
        subjects: typeof s.subjects === "string" ? JSON.parse(s.subjects) : s.subjects
      });
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM students WHERE id = ?", [id]);
    const student = rows[0];
    if (student) {
      await db.query("DELETE FROM students WHERE id = ?", [id]);
      await logActivity(`Deleted student profile: ${student.name}`, "alert");
      res.json({ success: true, message: `Deleted student ${student.name}` });
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= FACULTY ENDPOINTS =============

app.get("/api/faculty", async (req, res) => {
  try {
    const [faculty] = await db.query("SELECT * FROM faculty");
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/faculty", async (req, res) => {
  try {
    const newFaculty = req.body;
    await db.query(
      "INSERT INTO faculty (id, name, department, designation, email, status) VALUES (?, ?, ?, ?, ?, ?)",
      [newFaculty.id, newFaculty.name, newFaculty.department, newFaculty.designation, newFaculty.email, newFaculty.status]
    );
    await logActivity(`Faculty member ${newFaculty.name} registered`, "faculty");
    res.status(201).json(newFaculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/faculty/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM faculty WHERE id = ?", [id]);
    const f = rows[0];
    if (f) {
      await db.query("DELETE FROM faculty WHERE id = ?", [id]);
      await logActivity(`Removed faculty member ${f.name} from roster`, "alert");
      res.json({ success: true, message: `Removed faculty ${f.name}` });
    } else {
      res.status(404).json({ error: "Faculty member not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= BOOK ENDPOINTS =============

app.get("/api/books", async (req, res) => {
  try {
    const [books] = await db.query("SELECT * FROM books");
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/books", async (req, res) => {
  try {
    const newBook = req.body;
    newBook.status = "Available";
    newBook.borrowedBy = null;
    
    await db.query(
      "INSERT INTO books (isbn, title, author, status, borrowedBy) VALUES (?, ?, ?, ?, ?)",
      [newBook.isbn, newBook.title, newBook.author, newBook.status, newBook.borrowedBy]
    );
    await logActivity(`Added catalog book: '${newBook.title}'`, "book");
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/books/:isbn/borrow", async (req, res) => {
  try {
    const { isbn } = req.params;
    const { studentName } = req.body;
    const [rows] = await db.query("SELECT * FROM books WHERE isbn = ?", [isbn]);
    const book = rows[0];
    if (book) {
      await db.query("UPDATE books SET status = 'Borrowed', borrowedBy = ? WHERE isbn = ?", [studentName, isbn]);
      await logActivity(`${studentName} checked out '${book.title}'`, "book");
      const [updated] = await db.query("SELECT * FROM books WHERE isbn = ?", [isbn]);
      res.json(updated[0]);
    } else {
      res.status(404).json({ error: "Book not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/books/:isbn/return", async (req, res) => {
  try {
    const { isbn } = req.params;
    const [rows] = await db.query("SELECT * FROM books WHERE isbn = ?", [isbn]);
    const book = rows[0];
    if (book) {
      const borrower = book.borrowedBy;
      await db.query("UPDATE books SET status = 'Available', borrowedBy = NULL WHERE isbn = ?", [isbn]);
      await logActivity(`${borrower} returned book '${book.title}'`, "book");
      const [updated] = await db.query("SELECT * FROM books WHERE isbn = ?", [isbn]);
      res.json(updated[0]);
    } else {
      res.status(404).json({ error: "Book not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= TRANSACTIONS ENDPOINTS =============

app.get("/api/transactions", async (req, res) => {
  try {
    const [txns] = await db.query("SELECT * FROM transactions ORDER BY date DESC, txnId DESC");
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const newTxn = req.body;
    newTxn.txnId = `TXN-${Math.floor(10000 + Math.random() * 90000)}`;
    newTxn.date = new Date().toISOString().split("T")[0];
    newTxn.status = "Success";
    
    await db.query(
      "INSERT INTO transactions (txnId, studentName, rollNo, feeCategory, amount, paymentMode, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [newTxn.txnId, newTxn.studentName, newTxn.rollNo, newTxn.feeCategory, newTxn.amount, newTxn.paymentMode, newTxn.date, newTxn.status]
    );
    await logActivity(`${newTxn.studentName} paid ₹${newTxn.amount.toLocaleString("en-IN")} - ${newTxn.feeCategory}`, "payment");
    res.status(201).json(newTxn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ACTIVITIES FEED =============

app.get("/api/activities", async (req, res) => {
  try {
    const [activities] = await db.query("SELECT * FROM activities ORDER BY id DESC");
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= NOTIFICATION ENDPOINTS =============

app.get("/api/notifications", async (req, res) => {
  try {
    const role = req.query.role || "admin";
    const [notifications] = await db.query(
      "SELECT * FROM notifications WHERE for_role = 'all' OR for_role = ? ORDER BY id DESC",
      [role]
    );
    const mapped = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      for: n.for_role,
      read: !!n.read,
      time: n.time
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const notification = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM notifications");
    const count = countResult[0].count;
    
    notification.id = `NTF-${String(count + 1).padStart(3, "0")}`;
    notification.read = false;
    notification.time = "Just now";
    
    await db.query(
      "INSERT INTO notifications (id, type, title, message, for_role, `read`, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [notification.id, notification.type, notification.title, notification.message, notification.for || "all", 0, notification.time]
    );
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE notifications SET `read` = 1 WHERE id = ?", [id]);
    const [updated] = await db.query("SELECT * FROM notifications WHERE id = ?", [id]);
    if (updated.length > 0) {
      const n = updated[0];
      res.json({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        for: n.for_role,
        read: !!n.read,
        time: n.time
      });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/read-all", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET `read` = 1");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ANNOUNCEMENT ENDPOINTS =============

app.get("/api/announcements", async (req, res) => {
  try {
    const [announcements] = await db.query("SELECT * FROM announcements ORDER BY date DESC, id DESC");
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/announcements", async (req, res) => {
  try {
    const announcement = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM announcements");
    const count = countResult[0].count;
    
    announcement.id = `ANN-${String(count + 1).padStart(3, "0")}`;
    announcement.date = new Date().toISOString().split("T")[0];
    
    await db.query(
      "INSERT INTO announcements (id, title, message, author, date, priority) VALUES (?, ?, ?, ?, ?, ?)",
      [announcement.id, announcement.title, announcement.message, announcement.author, announcement.date, announcement.priority]
    );
    await logActivity(`New announcement: ${announcement.title}`, "alert");
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ADMISSION ENDPOINTS =============

app.get("/api/admissions", async (req, res) => {
  try {
    const [admissions] = await db.query("SELECT * FROM pending_admissions");
    const mapped = admissions.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      department: a.department,
      guardian: a.guardian,
      guardianPhone: a.guardianPhone,
      appliedDate: a.appliedDate.toISOString().split("T")[0],
      status: a.status
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admissions", async (req, res) => {
  try {
    const admission = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM pending_admissions");
    const count = countResult[0].count;
    
    admission.id = `ADM-${String(count + 1).padStart(3, "0")}`;
    admission.appliedDate = new Date().toISOString().split("T")[0];
    admission.status = "pending";
    
    await db.query(
      "INSERT INTO pending_admissions (id, name, email, phone, department, guardian, guardianPhone, appliedDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [admission.id, admission.name, admission.email, admission.phone, admission.department, admission.guardian, admission.guardianPhone || null, admission.appliedDate, admission.status]
    );
    await logActivity(`New admission application from ${admission.name}`, "profile");
    res.status(201).json(admission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admissions/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const [admissions] = await db.query("SELECT * FROM pending_admissions WHERE id = ?", [id]);
    const admission = admissions[0];
    
    if (admission) {
      await db.query("UPDATE pending_admissions SET status = 'approved' WHERE id = ?", [id]);
      
      const [studentsCount] = await db.query("SELECT COUNT(*) as count FROM students");
      const sCount = studentsCount[0].count;
      const newStudentId = `STU-${String(sCount + 1).padStart(3, "0")}`;
      const rollNo = `${admission.department.toUpperCase()}-2026-${String(sCount + 1).padStart(3, "0")}`;
      
      await db.query(
        "INSERT INTO students (id, name, rollNo, department, email, phone, guardian, attendance, gpa, gradeTrends, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newStudentId, admission.name, rollNo, admission.department, admission.email, admission.phone, admission.guardian, 0, 0.00, JSON.stringify([0,0,0,0]), JSON.stringify({dsa:0, dbms:0, web:0, os:0})]
      );
      
      const [usersCount] = await db.query("SELECT COUNT(*) as count FROM users");
      const uCount = usersCount[0].count;
      const newUserId = `USR-${String(uCount + 1).padStart(3, "0")}`;
      const avatar = admission.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
      
      await db.query(
        "INSERT INTO users (id, email, password, role, name, avatar, studentId) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newUserId, admission.email, "student123", "student", admission.name, avatar, newStudentId]
      );
      
      await logActivity(`Admission approved: ${admission.name} enrolled as ${rollNo}`, "profile");
      res.json({ success: true, student: { id: newStudentId, name: admission.name, rollNo } });
    } else {
      res.status(404).json({ error: "Admission not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admissions/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM pending_admissions WHERE id = ?", [id]);
    if (rows.length > 0) {
      await db.query("UPDATE pending_admissions SET status = 'rejected' WHERE id = ?", [id]);
      await logActivity(`Admission rejected: ${rows[0].name}`, "alert");
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Admission not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= NEW FACILITY ENDPOINTS =============

// ============= HOSTEL MANAGEMENT =============

app.get("/api/hostel/rooms", async (req, res) => {
  try {
    const [rooms] = await db.query("SELECT * FROM hostel_rooms");
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hostel/rooms", async (req, res) => {
  try {
    const room = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM hostel_rooms");
    const count = countResult[0].count;
    room.id = `ROM-${String(count + 1).padStart(3, "0")}`;
    room.occupied = 0;
    room.status = "available";
    
    await db.query(
      "INSERT INTO hostel_rooms (id, roomNumber, block, capacity, occupied, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [room.id, room.roomNumber, room.block, room.capacity, room.occupied, room.type, room.status]
    );
    await logActivity(`New hostel room added: ${room.roomNumber}`, "home");
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/hostel/rooms/:id/allocate", async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    await db.query("UPDATE hostel_rooms SET occupied = occupied + 1, status = 'occupied' WHERE id = ?", [id]);
    await logActivity(`Room allocated to student ${studentId}`, "home");
    const [updated] = await db.query("SELECT * FROM hostel_rooms WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/hostel/mess", async (req, res) => {
  try {
    const [mess] = await db.query("SELECT * FROM hostel_mess");
    res.json(mess);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hostel/mess", async (req, res) => {
  try {
    const mess = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM hostel_mess");
    const count = countResult[0].count;
    mess.id = `MES-${String(count + 1).padStart(3, "0")}`;
    mess.status = "active";
    
    await db.query(
      "INSERT INTO hostel_mess (id, studentId, studentName, mealPlan, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [mess.id, mess.studentId, mess.studentName, mess.mealPlan, mess.startDate, mess.endDate, mess.status]
    );
    await logActivity(`Mess plan registered for ${mess.studentName}`, "home");
    res.status(201).json(mess);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/hostel/visitors", async (req, res) => {
  try {
    const [visitors] = await db.query("SELECT * FROM hostel_visitors ORDER BY visitDate DESC");
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hostel/visitors", async (req, res) => {
  try {
    const visitor = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM hostel_visitors");
    const count = countResult[0].count;
    visitor.id = `VIS-${String(count + 1).padStart(3, "0")}`;
    visitor.status = "checked-in";
    visitor.checkOutTime = null;
    
    await db.query(
      "INSERT INTO hostel_visitors (id, studentId, studentName, visitorName, visitorPhone, relation, visitDate, checkInTime, checkOutTime, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [visitor.id, visitor.studentId, visitor.studentName, visitor.visitorName, visitor.visitorPhone, visitor.relation, visitor.visitDate, visitor.checkInTime, visitor.checkOutTime, visitor.purpose, visitor.status]
    );
    await logActivity(`Visitor ${visitor.visitorName} checked in for ${visitor.studentName}`, "home");
    res.status(201).json(visitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/hostel/visitors/:id/checkout", async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOutTime } = req.body;
    await db.query("UPDATE hostel_visitors SET status = 'checked-out', checkOutTime = ? WHERE id = ?", [checkOutTime, id]);
    await logActivity(`Visitor checked out`, "home");
    const [updated] = await db.query("SELECT * FROM hostel_visitors WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= LIBRARY MANAGEMENT (ENHANCED) =============

app.get("/api/library/reservations", async (req, res) => {
  try {
    const [reservations] = await db.query("SELECT * FROM library_reservations ORDER BY reservationDate DESC");
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/library/reservations", async (req, res) => {
  try {
    const reservation = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM library_reservations");
    const count = countResult[0].count;
    reservation.id = `RES-${String(count + 1).padStart(3, "0")}`;
    reservation.status = "pending";
    
    await db.query(
      "INSERT INTO library_reservations (id, isbn, studentId, studentName, reservationDate, status) VALUES (?, ?, ?, ?, ?, ?)",
      [reservation.id, reservation.isbn, reservation.studentId, reservation.studentName, reservation.reservationDate, reservation.status]
    );
    await logActivity(`Book reservation by ${reservation.studentName}`, "book");
    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/library/fines", async (req, res) => {
  try {
    const [fines] = await db.query("SELECT * FROM library_fines ORDER BY dueDate DESC");
    res.json(fines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/library/fines", async (req, res) => {
  try {
    const fine = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM library_fines");
    const count = countResult[0].count;
    fine.id = `FIN-${String(count + 1).padStart(3, "0")}`;
    fine.status = "unpaid";
    
    await db.query(
      "INSERT INTO library_fines (id, isbn, studentId, studentName, borrowedDate, dueDate, returnDate, fineAmount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [fine.id, fine.isbn, fine.studentId, fine.studentName, fine.borrowedDate, fine.dueDate, fine.returnDate, fine.fineAmount, fine.status]
    );
    await logActivity(`Fine recorded for ${fine.studentName}`, "alert");
    res.status(201).json(fine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/library/fines/:id/pay", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE library_fines SET status = 'paid' WHERE id = ?", [id]);
    await logActivity(`Library fine paid`, "payment");
    const [updated] = await db.query("SELECT * FROM library_fines WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= SALON SERVICES =============

app.get("/api/salon/appointments", async (req, res) => {
  try {
    const [appointments] = await db.query("SELECT * FROM salon_appointments ORDER BY appointmentDate DESC");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/salon/appointments", async (req, res) => {
  try {
    const appointment = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM salon_appointments");
    const count = countResult[0].count;
    appointment.id = `SAL-${String(count + 1).padStart(3, "0")}`;
    appointment.status = "scheduled";
    
    await db.query(
      "INSERT INTO salon_appointments (id, studentId, studentName, serviceType, appointmentDate, appointmentTime, staff, status, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [appointment.id, appointment.studentId, appointment.studentName, appointment.serviceType, appointment.appointmentDate, appointment.appointmentTime, appointment.staff, appointment.status, appointment.amount]
    );
    await logActivity(`Salon appointment booked by ${appointment.studentName}`, "profile");
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/salon/appointments/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE salon_appointments SET status = 'completed' WHERE id = ?", [id]);
    await logActivity(`Salon appointment completed`, "profile");
    const [updated] = await db.query("SELECT * FROM salon_appointments WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/salon/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM salon_appointments WHERE id = ?", [id]);
    await logActivity(`Salon appointment cancelled`, "alert");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= SPORTS FACILITIES =============

app.get("/api/sports/bookings", async (req, res) => {
  try {
    const [bookings] = await db.query("SELECT * FROM sports_bookings ORDER BY bookingDate DESC");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sports/bookings", async (req, res) => {
  try {
    const booking = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM sports_bookings");
    const count = countResult[0].count;
    booking.id = `SPT-${String(count + 1).padStart(3, "0")}`;
    booking.status = "confirmed";
    
    await db.query(
      "INSERT INTO sports_bookings (id, facilityName, studentId, studentName, bookingDate, startTime, endTime, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [booking.id, booking.facilityName, booking.studentId, booking.studentName, booking.bookingDate, booking.startTime, booking.endTime, booking.purpose, booking.status]
    );
    await logActivity(`Sports facility booked: ${booking.facilityName} by ${booking.studentName}`, "profile");
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/sports/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM sports_bookings WHERE id = ?", [id]);
    await logActivity(`Sports booking cancelled`, "alert");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= CAFETERIA / CANTEEN =============

app.get("/api/cafeteria/orders", async (req, res) => {
  try {
    const [orders] = await db.query("SELECT * FROM cafeteria_orders ORDER BY orderDate DESC");
    const mapped = orders.map(o => ({
      ...o,
      items: typeof o.items === "string" ? JSON.parse(o.items) : o.items
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cafeteria/orders", async (req, res) => {
  try {
    const order = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM cafeteria_orders");
    const count = countResult[0].count;
    order.id = `CAF-${String(count + 1).padStart(3, "0")}`;
    order.status = "pending";
    order.orderDate = new Date().toISOString().split("T")[0];
    order.orderTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
    
    await db.query(
      "INSERT INTO cafeteria_orders (id, studentId, studentName, items, totalAmount, orderDate, orderTime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [order.id, order.studentId, order.studentName, JSON.stringify(order.items), order.totalAmount, order.orderDate, order.orderTime, order.status]
    );
    await logActivity(`Cafeteria order by ${order.studentName}`, "payment");
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cafeteria/orders/:id/ready", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE cafeteria_orders SET status = 'ready' WHERE id = ?", [id]);
    await logActivity(`Cafeteria order ready`, "profile");
    const [updated] = await db.query("SELECT * FROM cafeteria_orders WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= TRANSPORTATION =============

app.get("/api/transport/routes", async (req, res) => {
  try {
    const [routes] = await db.query("SELECT * FROM transport_routes");
    const mapped = routes.map(r => ({
      ...r,
      stops: typeof r.stops === "string" ? JSON.parse(r.stops) : r.stops
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transport/routes", async (req, res) => {
  try {
    const route = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM transport_routes");
    const count = countResult[0].count;
    route.id = `RTE-${String(count + 1).padStart(3, "0")}`;
    route.status = "active";
    
    await db.query(
      "INSERT INTO transport_routes (id, routeNumber, routeName, stops, driverName, driverPhone, vehicleNumber, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [route.id, route.routeNumber, route.routeName, JSON.stringify(route.stops), route.driverName, route.driverPhone, route.vehicleNumber, route.capacity, route.status]
    );
    await logActivity(`New transport route added: ${route.routeName}`, "alert");
    res.status(201).json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/transport/passes", async (req, res) => {
  try {
    const [passes] = await db.query("SELECT * FROM transport_passes ORDER BY issueDate DESC");
    res.json(passes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transport/passes", async (req, res) => {
  try {
    const pass = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM transport_passes");
    const count = countResult[0].count;
    pass.id = `PAS-${String(count + 1).padStart(3, "0")}`;
    pass.status = "active";
    pass.issueDate = new Date().toISOString().split("T")[0];
    
    await db.query(
      "INSERT INTO transport_passes (id, studentId, studentName, routeId, issueDate, expiryDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [pass.id, pass.studentId, pass.studentName, pass.routeId, pass.issueDate, pass.expiryDate, pass.status]
    );
    await logActivity(`Transport pass issued to ${pass.studentName}`, "profile");
    res.status(201).json(pass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= HEALTH CENTER =============

app.get("/api/health/records", async (req, res) => {
  try {
    const [records] = await db.query("SELECT * FROM health_records ORDER BY visitDate DESC");
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/health/records", async (req, res) => {
  try {
    const record = req.body;
    const [countResult] = await db.query("SELECT COUNT(*) as count FROM health_records");
    const count = countResult[0].count;
    record.id = `HLT-${String(count + 1).padStart(3, "0")}`;
    record.visitDate = new Date().toISOString().split("T")[0];
    
    await db.query(
      "INSERT INTO health_records (id, studentId, studentName, visitDate, diagnosis, treatment, doctor, notes, followUpDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [record.id, record.studentId, record.studentName, record.visitDate, record.diagnosis, record.treatment, record.doctor, record.notes || null, record.followUpDate || null]
    );
    await logActivity(`Health record added for ${record.studentName}`, "alert");
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= GLOBAL ANALYTICS =============

app.get("/api/analytics", async (req, res) => {
  try {
    const [studentsCount] = await db.query("SELECT COUNT(*) as count FROM students");
    const totalStudents = studentsCount[0].count;
    
    const [facultyCount] = await db.query("SELECT COUNT(*) as count FROM faculty");
    const totalFaculty = facultyCount[0].count;
    
    const [transResult] = await db.query("SELECT * FROM transactions WHERE status = 'Success'");
    const totalCollected = transResult.reduce((sum, t) => sum + t.amount, 0);
    const totalInvoiced = totalStudents * 50000;
    const outstanding = Math.max(0, totalInvoiced - totalCollected);
    
    const [booksResult] = await db.query("SELECT COUNT(*) as count FROM books WHERE status = 'Borrowed'");
    const borrowedBooks = booksResult[0].count;
    
    const [admissionsResult] = await db.query("SELECT COUNT(*) as count FROM pending_admissions WHERE status = 'pending'");
    const pendingAdmissions = admissionsResult[0].count;
    
    const [notifsResult] = await db.query("SELECT COUNT(*) as count FROM notifications WHERE `read` = 0");
    const unreadNotifications = notifsResult[0].count;
    
    res.json({
      totalStudents,
      totalFaculty,
      totalInvoiced,
      totalCollected,
      outstanding,
      borrowedBooks,
      pendingAdmissions,
      unreadNotifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Express server running on MySQL and listening on http://localhost:${PORT}`);
});
