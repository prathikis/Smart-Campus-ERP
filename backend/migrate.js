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

  // Drop tables in correct order if exist
  const dropTables = [
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
          "INSERT INTO students (id, name, rollNo, department, email, phone, guardian, attendance, gpa, gradeTrends, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [s.id, s.name, s.rollNo, s.department, s.email, s.phone, s.guardian, s.attendance, s.gpa, JSON.stringify(s.gradeTrends || []), JSON.stringify(s.subjects || {})]
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
