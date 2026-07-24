const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DB_FILE = path.join(__dirname, "data.json");

async function run() {
  console.log("Starting MySQL database migration...");
  
  // Connection without database name to create database if not exists
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  const dbName = process.env.DB_NAME || "smart_campus_erp";
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`Database "${dbName}" checked/created.`);
  await connection.end();

  // Re-establish connection with DB name
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: dbName
  });

  console.log("Creating tables...");

  // Drop tables in correct order if exist (child tables before parent tables)
  const dropTables = [
    "health_records",
    "transport_passes",     // Drop child before parent
    "transport_routes",
    "cafeteria_orders",
    "sports_bookings",
    "salon_appointments",
    "hostel_visitors",
    "hostel_rooms",
    "hostel_mess",
    "library_reservations",
    "library_fines",
    "pending_admissions",
    "announcements",
    "notifications",
    "activities",
    "transactions",
    "books",
    "faculty",
    "students",
    "users"
  ];
  for (const t of dropTables) {
    await db.query(`DROP TABLE IF EXISTS \`${t}\``);
  }

  // Create tables
  await db.query(`
    CREATE TABLE users (
      id VARCHAR(50) PRIMARY KEY,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      avatar VARCHAR(10) NOT NULL,
      department VARCHAR(50) NULL,
      studentId VARCHAR(50) NULL,
      childStudentId VARCHAR(50) NULL
    )
  `);

  await db.query(`
    CREATE TABLE students (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      rollNo VARCHAR(50) NOT NULL,
      department VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      guardian VARCHAR(100) NOT NULL,
      guardianPhone VARCHAR(20) NULL,
      gender VARCHAR(20) NULL,
      dob DATE NULL,
      bloodGroup VARCHAR(10) NULL,
      address TEXT NULL,
      attendance INT DEFAULT 0,
      gpa DECIMAL(4,2) DEFAULT 0.00,
      gradeTrends JSON NULL,
      subjects JSON NULL
    )
  `);

  await db.query(`
    CREATE TABLE faculty (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE books (
      isbn VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Available',
      borrowedBy VARCHAR(100) NULL
    )
  `);

  await db.query(`
    CREATE TABLE transactions (
      txnId VARCHAR(50) PRIMARY KEY,
      studentName VARCHAR(100) NOT NULL,
      rollNo VARCHAR(50) NOT NULL,
      feeCategory VARCHAR(100) NOT NULL,
      amount INT NOT NULL,
      paymentMode VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Success'
    )
  `);

  await db.query(`
    CREATE TABLE activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      time VARCHAR(50) NOT NULL,
      icon VARCHAR(20) NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE notifications (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      title VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      for_role VARCHAR(20) NOT NULL,
      \`read\` BOOLEAN DEFAULT FALSE,
      time VARCHAR(50) NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE announcements (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      author VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      priority VARCHAR(20) NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE pending_admissions (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      department VARCHAR(50) NOT NULL,
      guardian VARCHAR(100) NOT NULL,
      guardianPhone VARCHAR(20) NULL,
      appliedDate DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
    )
  `);

  // ============= NEW FACILITY TABLES =============

  // Library Management (Enhanced)
  await db.query(`
    CREATE TABLE library_reservations (
      id VARCHAR(50) PRIMARY KEY,
      isbn VARCHAR(50) NOT NULL,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      reservationDate DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE library_fines (
      id VARCHAR(50) PRIMARY KEY,
      isbn VARCHAR(50) NOT NULL,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      borrowedDate DATE NOT NULL,
      dueDate DATE NOT NULL,
      returnDate DATE NULL,
      fineAmount DECIMAL(10,2) DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
      FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE CASCADE
    )
  `);

  // Hostel Management
  await db.query(`
    CREATE TABLE hostel_rooms (
      id VARCHAR(50) PRIMARY KEY,
      roomNumber VARCHAR(20) NOT NULL UNIQUE,
      block VARCHAR(20) NOT NULL,
      capacity INT NOT NULL DEFAULT 3,
      occupied INT NOT NULL DEFAULT 0,
      type VARCHAR(20) NOT NULL DEFAULT 'AC',
      status VARCHAR(20) NOT NULL DEFAULT 'available'
    )
  `);

  await db.query(`
    CREATE TABLE hostel_mess (
      id VARCHAR(50) PRIMARY KEY,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      mealPlan VARCHAR(20) NOT NULL DEFAULT 'standard',
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE hostel_visitors (
      id VARCHAR(50) PRIMARY KEY,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      visitorName VARCHAR(100) NOT NULL,
      visitorPhone VARCHAR(20) NOT NULL,
      relation VARCHAR(50) NOT NULL,
      visitDate DATE NOT NULL,
      checkInTime VARCHAR(20) NOT NULL,
      checkOutTime VARCHAR(20) NULL,
      purpose VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'checked-in',
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Salon Services
  await db.query(`
    CREATE TABLE salon_appointments (
      id VARCHAR(50) PRIMARY KEY,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      serviceType VARCHAR(50) NOT NULL,
      appointmentDate DATE NOT NULL,
      appointmentTime VARCHAR(20) NOT NULL,
      staff VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      amount DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Sports Facilities
  await db.query(`
    CREATE TABLE sports_bookings (
      id VARCHAR(50) PRIMARY KEY,
      facilityName VARCHAR(100) NOT NULL,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      bookingDate DATE NOT NULL,
      startTime VARCHAR(20) NOT NULL,
      endTime VARCHAR(20) NOT NULL,
      purpose VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Cafeteria/Canteen
  await db.query(`
    CREATE TABLE cafeteria_orders (
      id VARCHAR(50) PRIMARY KEY,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      items JSON NOT NULL,
      totalAmount DECIMAL(10,2) NOT NULL,
      orderDate DATE NOT NULL,
      orderTime VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Transportation
  await db.query(`
    CREATE TABLE transport_routes (
      id VARCHAR(50) PRIMARY KEY,
      routeNumber VARCHAR(20) NOT NULL UNIQUE,
      routeName VARCHAR(100) NOT NULL,
      stops JSON NOT NULL,
      driverName VARCHAR(100) NOT NULL,
      driverPhone VARCHAR(20) NOT NULL,
      vehicleNumber VARCHAR(20) NOT NULL,
      capacity INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
  `);

  await db.query(`
    CREATE TABLE transport_passes (
      id VARCHAR(50) PRIMARY KEY,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      routeId VARCHAR(50) NOT NULL,
      issueDate DATE NOT NULL,
      expiryDate DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (routeId) REFERENCES transport_routes(id) ON DELETE CASCADE
    )
  `);

  // Health Center
  await db.query(`
    CREATE TABLE health_records (
      id VARCHAR(50) PRIMARY KEY,
      studentId VARCHAR(50) NOT NULL,
      studentName VARCHAR(100) NOT NULL,
      visitDate DATE NOT NULL,
      diagnosis VARCHAR(255) NOT NULL,
      treatment VARCHAR(255) NOT NULL,
      doctor VARCHAR(100) NOT NULL,
      notes TEXT NULL,
      followUpDate DATE NULL,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  console.log("All tables created successfully.");

  // Import data from data.json if exists
  if (fs.existsSync(DB_FILE)) {
    console.log("Reading data.json to seed MySQL tables...");
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const seed = JSON.parse(raw);

    // Seed users
    if (seed.users && seed.users.length > 0) {
      for (const u of seed.users) {
        await db.query(
          "INSERT INTO users (id, email, password, role, name, avatar, department, studentId, childStudentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [u.id, u.email, u.password, u.role, u.name, u.avatar, u.department || null, u.studentId || null, u.childStudentId || null]
        );
      }
      console.log(`Seeded ${seed.users.length} users.`);
    }

    // Seed students
    if (seed.students && seed.students.length > 0) {
      for (const s of seed.students) {
        await db.query(
          "INSERT INTO students (id, name, rollNo, department, email, phone, guardian, guardianPhone, gender, dob, bloodGroup, address, attendance, gpa, gradeTrends, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [s.id, s.name, s.rollNo, s.department, s.email, s.phone, s.guardian, s.guardianPhone || null, s.gender || null, s.dob || null, s.bloodGroup || null, s.address || null, s.attendance, s.gpa, JSON.stringify(s.gradeTrends || []), JSON.stringify(s.subjects || {})]
        );
      }
      console.log(`Seeded ${seed.students.length} students.`);
    }

    // Seed faculty
    if (seed.faculty && seed.faculty.length > 0) {
      for (const f of seed.faculty) {
        await db.query(
          "INSERT INTO faculty (id, name, department, designation, email, status) VALUES (?, ?, ?, ?, ?, ?)",
          [f.id, f.name, f.department, f.designation, f.email, f.status]
        );
      }
      console.log(`Seeded ${seed.faculty.length} faculty members.`);
    }

    // Seed books
    if (seed.books && seed.books.length > 0) {
      for (const b of seed.books) {
        await db.query(
          "INSERT INTO books (isbn, title, author, status, borrowedBy) VALUES (?, ?, ?, ?, ?)",
          [b.isbn, b.title, b.author, b.status, b.borrowedBy || null]
        );
      }
      console.log(`Seeded ${seed.books.length} books.`);
    }

    // Seed transactions
    if (seed.transactions && seed.transactions.length > 0) {
      for (const t of seed.transactions) {
        await db.query(
          "INSERT INTO transactions (txnId, studentName, rollNo, feeCategory, amount, paymentMode, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [t.txnId, t.studentName, t.rollNo, t.feeCategory, t.amount, t.paymentMode, t.date, t.status]
        );
      }
      console.log(`Seeded ${seed.transactions.length} transactions.`);
    }

    // Seed activities
    if (seed.activities && seed.activities.length > 0) {
      for (const a of seed.activities) {
        await db.query(
          "INSERT INTO activities (text, time, icon) VALUES (?, ?, ?)",
          [a.text, a.time, a.icon]
        );
      }
      console.log(`Seeded ${seed.activities.length} activities.`);
    }

    // Seed notifications
    if (seed.notifications && seed.notifications.length > 0) {
      for (const n of seed.notifications) {
        await db.query(
          "INSERT INTO notifications (id, type, title, message, for_role, `read`, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [n.id, n.type, n.title, n.message, n.for, n.read ? 1 : 0, n.time]
        );
      }
      console.log(`Seeded ${seed.notifications.length} notifications.`);
    }

    // Seed announcements
    if (seed.announcements && seed.announcements.length > 0) {
      for (const a of seed.announcements) {
        await db.query(
          "INSERT INTO announcements (id, title, message, author, date, priority) VALUES (?, ?, ?, ?, ?, ?)",
          [a.id, a.title, a.message, a.author, a.date, a.priority]
        );
      }
      console.log(`Seeded ${seed.announcements.length} announcements.`);
    }

    // Seed admissions
    if (seed.pendingAdmissions && seed.pendingAdmissions.length > 0) {
      for (const a of seed.pendingAdmissions) {
        await db.query(
          "INSERT INTO pending_admissions (id, name, email, phone, department, guardian, guardianPhone, appliedDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [a.id, a.name, a.email, a.phone, a.department, a.guardian, a.guardianPhone || null, a.appliedDate, a.status]
        );
      }
      console.log(`Seeded ${seed.pendingAdmissions.length} admissions.`);
    }

    // Seed new facilities data
    // Hostel Rooms
    if (seed.hostelRooms && seed.hostelRooms.length > 0) {
      for (const r of seed.hostelRooms) {
        await db.query(
          "INSERT INTO hostel_rooms (id, roomNumber, block, capacity, occupied, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [r.id, r.roomNumber, r.block, r.capacity, r.occupied, r.type, r.status]
        );
      }
      console.log(`Seeded ${seed.hostelRooms.length} hostel rooms.`);
    }

    // Hostel Mess
    if (seed.hostelMess && seed.hostelMess.length > 0) {
      for (const m of seed.hostelMess) {
        await db.query(
          "INSERT INTO hostel_mess (id, studentId, studentName, mealPlan, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [m.id, m.studentId, m.studentName, m.planType, m.startDate, m.endDate, m.status]
        );
      }
      console.log(`Seeded ${seed.hostelMess.length} hostel mess plans.`);
    }

    // Hostel Visitors
    if (seed.hostelVisitors && seed.hostelVisitors.length > 0) {
      for (const v of seed.hostelVisitors) {
        await db.query(
          "INSERT INTO hostel_visitors (id, studentId, studentName, visitorName, visitorPhone, relation, visitDate, checkInTime, checkOutTime, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [v.id, v.studentId, v.studentName, v.visitorName, v.visitorPhone || '9876543210', v.relation, v.visitDate, v.checkInTime, v.checkOutTime, v.purpose || 'Personal visit', v.status]
        );
      }
      console.log(`Seeded ${seed.hostelVisitors.length} hostel visitors.`);
    }

    // Library Reservations
    if (seed.libraryReservations && seed.libraryReservations.length > 0) {
      for (const r of seed.libraryReservations) {
        await db.query(
          "INSERT INTO library_reservations (id, isbn, studentId, studentName, reservationDate, status) VALUES (?, ?, ?, ?, ?, ?)",
          [r.id, r.isbn, r.studentId, r.studentName, r.reservationDate, r.status]
        );
      }
      console.log(`Seeded ${seed.libraryReservations.length} library reservations.`);
    }

    // Library Fines
    if (seed.libraryFines && seed.libraryFines.length > 0) {
      for (const f of seed.libraryFines) {
        await db.query(
          "INSERT INTO library_fines (id, isbn, studentId, studentName, borrowedDate, dueDate, returnDate, fineAmount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [f.id, f.isbn, f.studentId, f.studentName, f.borrowedDate || '2026-01-01', f.dueDate || '2026-01-15', f.returnDate || null, f.amount, f.status]
        );
      }
      console.log(`Seeded ${seed.libraryFines.length} library fines.`);
    }

    // Salon Appointments
    if (seed.salonAppointments && seed.salonAppointments.length > 0) {
      for (const a of seed.salonAppointments) {
        await db.query(
          "INSERT INTO salon_appointments (id, studentId, studentName, serviceType, appointmentDate, appointmentTime, staff, status, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [a.id, a.studentId, a.studentName, a.serviceType, a.appointmentDate, a.appointmentTime, a.staff, a.status, a.amount]
        );
      }
      console.log(`Seeded ${seed.salonAppointments.length} salon appointments.`);
    }

    // Sports Bookings
    if (seed.sportsBookings && seed.sportsBookings.length > 0) {
      for (const b of seed.sportsBookings) {
        await db.query(
          "INSERT INTO sports_bookings (id, facilityName, studentId, studentName, bookingDate, startTime, endTime, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [b.id, b.facilityName, b.studentId, b.studentName, b.bookingDate, b.startTime, b.endTime, b.purpose, b.status]
        );
      }
      console.log(`Seeded ${seed.sportsBookings.length} sports bookings.`);
    }

    // Cafeteria Orders
    if (seed.cafeteriaOrders && seed.cafeteriaOrders.length > 0) {
      for (const o of seed.cafeteriaOrders) {
        await db.query(
          "INSERT INTO cafeteria_orders (id, studentId, studentName, items, totalAmount, orderDate, orderTime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [o.id, o.studentId, o.studentName, JSON.stringify(o.items), o.totalAmount, o.orderDate, o.orderTime, o.status]
        );
      }
      console.log(`Seeded ${seed.cafeteriaOrders.length} cafeteria orders.`);
    }

    // Transport Routes
    if (seed.transportRoutes && seed.transportRoutes.length > 0) {
      for (const r of seed.transportRoutes) {
        await db.query(
          "INSERT INTO transport_routes (id, routeNumber, routeName, stops, driverName, driverPhone, vehicleNumber, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [r.id, r.routeNumber, r.routeName, JSON.stringify([]), r.driverName, r.driverPhone, r.vehicleNumber, r.capacity, r.status]
        );
      }
      console.log(`Seeded ${seed.transportRoutes.length} transport routes.`);
    }

    // Transport Passes
    if (seed.transportPasses && seed.transportPasses.length > 0) {
      for (const p of seed.transportPasses) {
        await db.query(
          "INSERT INTO transport_passes (id, studentId, studentName, routeId, issueDate, expiryDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [p.id, p.studentId, p.studentName, p.routeId, p.issueDate, p.expiryDate, p.status]
        );
      }
      console.log(`Seeded ${seed.transportPasses.length} transport passes.`);
    }

    // Health Records
    if (seed.healthRecords && seed.healthRecords.length > 0) {
      for (const h of seed.healthRecords) {
        await db.query(
          "INSERT INTO health_records (id, studentId, studentName, visitDate, diagnosis, treatment, doctor, notes, followUpDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [h.id, h.studentId, h.studentName, h.visitDate, h.diagnosis, h.treatment, h.doctor, h.notes, h.followUpDate]
        );
      }
      console.log(`Seeded ${seed.healthRecords.length} health records.`);
    }
  } else {
    console.log("data.json not found. Skipping seeding step.");
  }

  await db.end();
  console.log("MySQL database migration and seeding successfully finished!");
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
