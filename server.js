const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcryptjs");
const { initDb } = require("./db/init");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const db = initDb();

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname)));

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || "";
const SEMAPHORE_SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || "GGC Library";
const SMS_ENABLED = process.env.SMS_ENABLED === "true";
const CONTACT_REASONS = [
  "Borrowing concern",
  "Returning books",
  "Account or profile issue",
  "Book availability",
  "Technical problem",
  "General inquiry",
];

const otpStore = new Map();
const sessions = new Map();

function splitContactMessage(message) {
  const value = String(message || "");
  const separatorIndex = value.indexOf(": ");
  if (separatorIndex > 0) {
    const reason = value.slice(0, separatorIndex);
    if (CONTACT_REASONS.includes(reason)) {
      return { reason, body: value.slice(separatorIndex + 2) };
    }
  }
  return { reason: "Message", body: value };
}

function normalizePhone(phone) {
  const raw = String(phone || "").trim().replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("09") && raw.length === 11) return `+63${raw.slice(1)}`;
  if (raw.startsWith("639") && raw.length === 12) return `+${raw}`;
  return raw;
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(to, body) {
  if (!SMS_ENABLED) return { mock: true, sid: "mock-sid" };
  if (!SEMAPHORE_API_KEY) {
    throw new Error("Semaphore API key is missing.");
  }

  const response = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: SEMAPHORE_API_KEY,
      number: to,
      message: body,
      sendername: SEMAPHORE_SENDER_NAME,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result.message || result.error || `Semaphore request failed (${response.status})`;
    throw new Error(detail);
  }
  return { mock: false, sid: result.message_id || result.id || null };
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    schoolId: row.school_id,
    userType: row.user_type,
    course: row.course,
    role: row.role,
    status: row.status,
    freshAccount: Number(row.fresh_account) === 1,
  };
}

function requireSession(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const session = token ? sessions.get(token) : null;
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}

function addDaysMMDDYYYY(days) {
  if (!isValidDurationDays(days)) {
    throw new Error("Returning duration must result in a supported due date.");
  }
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function isValidDurationDays(days) {
  if (!Number.isSafeInteger(days) || days < 1) return false;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getFullYear() <= 9999;
}

function todayMMDDYYYY() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function logActivity(librarianName, action, details) {
  db.prepare("INSERT INTO activity_log (librarian_name, action, details) VALUES (?, ?, ?)").run(
    librarianName,
    action,
    details,
  );
}

function getBorrowingDurationDays(settingKey = "borrowing_duration_days") {
  const setting = db
    .prepare("SELECT setting_value FROM library_settings WHERE setting_key = ?")
    .get(settingKey);
  const duration = Number(setting?.setting_value);
  const fallback = settingKey === "faculty_borrowing_duration_days" ? 7 : 4;
  return isValidDurationDays(duration) ? duration : fallback;
}

function getDurationForUser(user) {
  const userType = String(user?.user_type || "").toLowerCase();
  const isFaculty = userType === "faculty" || userType === "teacher";
  return getBorrowingDurationDays(isFaculty ? "faculty_borrowing_duration_days" : "borrowing_duration_days");
}

function addDaysToMMDDYYYY(dateString, days) {
  const [month, day, year] = String(dateString).split("/").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getFullYear()}`;
}

/* ---------- Auth ---------- */

app.post("/api/auth/login", (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "Credentials required." });
  }

  const id = String(identifier).trim().toLowerCase();
  let user = db
    .prepare(
      `SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ? OR lower(name) = ? OR replace(upper(school_id),' ','') = replace(upper(?),' ','')`,
    )
    .get(id, id, id, id);

  const storedPassword = user && String(user.password || "");
  const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
  const passwordMatches = user && (
    isBcryptHash
      ? bcrypt.compareSync(String(password), storedPassword)
      : storedPassword === String(password)
  );

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  if (role && user.role !== role) {
    return res.status(401).json({ error: `Invalid credentials for ${role} role.` });
  }

  if (user.role !== "admin" && user.role !== "librarian" && user.status !== "active") {
    const error = user.status === "deactivated"
      ? "Account deactivated. Please contact the administrator."
      : "Account pending approval. Wait for administrator approval.";
    return res.status(403).json({ error });
  }

  if (!isBcryptHash) {
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(bcrypt.hashSync(String(password), 10), user.id);
  }

  const token = `tok_${user.id}_${Date.now()}`;
  sessions.set(token, { userId: user.id, role: user.role });

  if (user.role === "librarian") {
    logActivity(user.name, "Login", "logged in successfully");
  }

  return res.json({ ok: true, token, user: publicUser(user) });
});

app.post("/api/auth/profile", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId);
  if (!user) return res.status(404).json({ error: "User account not found." });

  const name = String(req.body.name || "").trim();
  const username = String(req.body.username ?? user.username ?? "").trim();
  const email = String(req.body.email ?? user.email ?? "").trim().toLowerCase();
  const phone = String(req.body.phone ?? user.phone ?? "").trim();
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!name || !username || !email) return res.status(400).json({ error: "Name, username, and email are required." });
  if (username.length > 255) return res.status(400).json({ error: "Username must be 255 characters or fewer." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: "Current password is required." });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
    const storedPassword = String(user.password || "");
    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
    const passwordMatches = isBcryptHash
      ? bcrypt.compareSync(currentPassword, storedPassword)
      : currentPassword === storedPassword;
    if (!passwordMatches) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
  }

  const duplicateUsername = db
    .prepare("SELECT id FROM users WHERE lower(username) = ? AND id <> ?")
    .get(username.toLowerCase(), user.id);
  if (duplicateUsername) return res.status(409).json({ error: "Username already in use." });

  const duplicate = db
    .prepare("SELECT id FROM users WHERE lower(email) = ? AND id <> ?")
    .get(email, user.id);
  if (duplicate) return res.status(409).json({ error: "Email already registered." });

  if (newPassword) {
    db.prepare("UPDATE users SET name = ?, username = ?, email = ?, phone = ?, password = ? WHERE id = ?")
      .run(name, username, email, phone || null, bcrypt.hashSync(newPassword, 10), user.id);
  } else {
    db.prepare("UPDATE users SET name = ?, username = ?, email = ?, phone = ? WHERE id = ?")
      .run(name, username, email, phone || null, user.id);
  }

  return res.json({ ok: true, user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, schoolId, password, userType, course, role } = req.body;
  if (!name || !email || !password || !phone || !schoolId) {
    return res.status(400).json({ error: "Required fields missing." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedSchoolId = String(schoolId).trim().replace(/\s+/g, "").toUpperCase();
  const existing = db
    .prepare("SELECT id, email, school_id FROM users WHERE lower(email) = ? OR replace(upper(school_id),' ','') = ?")
    .get(normalizedEmail, normalizedSchoolId);
  if (existing) {
    return res.status(409).json({
      error: String(existing.email).toLowerCase() === normalizedEmail ? "Email already registered." : "School ID already registered.",
    });
  }

  const userRole = role === "visitor" ? "visitor" : "member";
  const result = db
    .prepare(
      `INSERT INTO users (username, email, password, name, phone, school_id, user_type, course, role, status, fresh_account)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
    )
    .run(
      normalizedEmail.split("@")[0],
      normalizedEmail,
      bcrypt.hashSync(password, 10),
      String(name).trim(),
      normalizePhone(phone),
      normalizedSchoolId,
      userType || (userRole === "visitor" ? "Visitor" : "Student"),
      course || null,
      userRole,
    );

  return res.json({ ok: true, userId: result.lastInsertRowid, message: "Registration submitted. Await account approval." });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  return res.json({ ok: true });
});

/* ---------- SMS ---------- */

app.post("/api/sms/send-otp", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const name = String(req.body.name || "Member").trim();
    if (!phone) return res.status(400).json({ error: "Phone number is required." });

    const code = createOtpCode();
    otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

    const message = `Hello ${name}, your Golden Gate Library OTP is ${code}. It expires in 5 minutes.`;
    const smsResult = await sendSms(phone, message);

    return res.json({
      ok: true,
      message: "OTP sent.",
      mock: smsResult.mock,
      ...(smsResult.mock ? { devCode: code } : {}),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to send OTP." });
  }
});

app.post("/api/sms/verify-otp", (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || "").trim();
  if (!phone || !code) return res.status(400).json({ error: "Phone and code are required." });

  const entry = otpStore.get(phone);
  if (!entry) return res.status(400).json({ error: "OTP not found. Request a new one." });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "OTP expired. Request a new one." });
  }
  if (entry.code !== code) return res.status(400).json({ error: "Invalid OTP code." });

  otpStore.delete(phone);
  return res.json({ ok: true, message: "OTP verified." });
});

app.post("/api/sms/borrow-confirmation", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "Phone number is required." });

    const userName = String(req.body.userName || "Member");
    const bookTitle = String(req.body.bookTitle || "Book");
    const author = String(req.body.author || "Unknown Author");
    const borrowDate = String(req.body.borrowDate || "-");
    const dueDate = String(req.body.dueDate || "-");

    const message =
      `Dear ${userName}, you successfully borrowed "${bookTitle}" by ${author}. ` +
      `Borrowed: ${borrowDate}. Return by: ${dueDate}. Golden Gate Colleges Library System.`;

    const smsResult = await sendSms(phone, message);
    return res.json({ ok: true, mock: smsResult.mock, message: "Borrow confirmation SMS sent." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to send borrow confirmation." });
  }
});

app.post("/api/sms/overdue-notice", async (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "Borrower phone number is required." });
    const userName = String(req.body.userName || "Member");
    const bookTitle = String(req.body.bookTitle || "Book");
    const dueDate = String(req.body.dueDate || "-");
    const message = `Dear ${userName}, "${bookTitle}" is overdue (due ${dueDate}). Please return it to Golden Gate Colleges Library.`;
    const smsResult = await sendSms(phone, message);
    return res.json({ ok: true, mock: smsResult.mock });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to send overdue notice." });
  }
});

/* ---------- Books ---------- */

app.get("/api/books", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  let rows = db.prepare("SELECT * FROM books WHERE is_archived = 0 ORDER BY title").all();
  if (q) {
    rows = rows.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }
  return res.json(
    rows.map((b) => ({
      id: String(b.id),
      title: b.title,
      author: b.author,
      avail: b.available,
      total: b.total,
      isbn: b.isbn,
      publicationYear: b.publication_year,
    })),
  );
});

app.post("/api/books", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const { title, author, total, available, isbn, publicationYear } = req.body;
  if (!String(title || "").trim() || !String(author || "").trim() || !String(isbn || "").trim()) {
    return res.status(400).json({ error: "Title, author, and ISBN required." });
  }
  const parsedTotal = Number(total);
  const parsedAvailable = available === undefined ? parsedTotal : Number(available);
  if (!Number.isInteger(parsedTotal) || parsedTotal < 1 || !Number.isInteger(parsedAvailable) || parsedAvailable < 0 || parsedAvailable > parsedTotal) {
    return res.status(400).json({ error: "Total and available must be valid book counts." });
  }

  const result = db
    .prepare("INSERT INTO books (title, author, isbn, publication_year, total, available) VALUES (?, ?, ?, ?, ?, ?)")
    .run(String(title).trim(), String(author).trim(), isbn || null, publicationYear || null, parsedTotal, parsedAvailable);

  const lib = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  if (lib) logActivity(lib.name, "Catalog Update", `Added new book (${title})`);

  return res.status(201).json({ ok: true, id: String(result.lastInsertRowid) });
});

app.put("/api/books/:id", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const bookId = Number(req.params.id);
  if (!Number.isInteger(bookId) || bookId < 1) return res.status(400).json({ error: "Invalid book ID." });

  const title = String(req.body.title || "").trim();
  const author = String(req.body.author || "").trim();
  const isbn = String(req.body.isbn || "").trim();
  const total = Number(req.body.total);
  const available = Number(req.body.available);
  if (!title || !author || !isbn) {
    return res.status(400).json({ error: "Title, author, and ISBN are required." });
  }
  if (!Number.isInteger(total) || total < 1) {
    return res.status(400).json({ error: "Total stock must be a positive whole number." });
  }
  if (!Number.isInteger(available) || available < 0) {
    return res.status(400).json({ error: "Available copies must be a non-negative whole number." });
  }

  const book = db.prepare("SELECT id, total FROM books WHERE id = ? AND is_archived = 0").get(bookId);
  if (!book) return res.status(404).json({ error: "Book not found." });

  const checkedOut = db
    .prepare("SELECT COUNT(*) AS count FROM transactions WHERE book_id = ? AND status IN ('borrowed', 'overdue', 'return_pending')")
    .get(bookId).count;
  if (available + Number(checkedOut) > total) {
    return res.status(400).json({ error: `Total stock must be at least ${available + Number(checkedOut)} to include available and checked-out copies.` });
  }

  db.prepare("UPDATE books SET title = ?, author = ?, isbn = ?, total = ?, available = ? WHERE id = ?").run(
    title,
    author,
    isbn,
    total,
    available,
    bookId,
  );
  const librarian = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  if (librarian) logActivity(librarian.name, "Catalog Update", `Edited book (${title})`);
  return res.json({ ok: true });
});

app.delete("/api/books/:id", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const bookId = Number(req.params.id);
  if (!Number.isInteger(bookId) || bookId < 1) return res.status(400).json({ error: "Invalid book ID." });

  const book = db.prepare("SELECT id, title FROM books WHERE id = ? AND is_archived = 0").get(bookId);
  if (!book) return res.status(404).json({ error: "Book not found." });

  const pendingTransaction = db
    .prepare("SELECT id FROM transactions WHERE book_id = ? AND status = 'pending' LIMIT 1")
    .get(bookId);
  if (pendingTransaction) {
    return res.status(409).json({ error: "Resolve pending borrow requests for this book before removing it from the catalog." });
  }

  db.prepare("DELETE FROM cart_items WHERE book_id = ?").run(bookId);
  db.prepare("UPDATE books SET is_archived = 1 WHERE id = ?").run(bookId);

  const librarian = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  if (librarian) logActivity(librarian.name, "Catalog Update", `Removed book from active catalog (${book.title})`);
  return res.json({ ok: true });
});

/* ---------- Cart ---------- */

app.get("/api/cart", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const rows = db
    .prepare(
      `SELECT b.* FROM cart_items c JOIN books b ON b.id = c.book_id WHERE c.user_id = ? AND b.is_archived = 0 ORDER BY b.title`,
    )
    .all(session.userId);

  return res.json(
    rows.map((b) => ({ id: String(b.id), title: b.title, author: b.author, avail: b.available, total: b.total })),
  );
});

app.post("/api/cart/:bookId", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  db.prepare("INSERT IGNORE INTO cart_items (user_id, book_id) VALUES (?, ?)").run(session.userId, req.params.bookId);
  return res.json({ ok: true });
});

app.delete("/api/cart/:bookId", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  db.prepare("DELETE FROM cart_items WHERE user_id = ? AND book_id = ?").run(session.userId, req.params.bookId);
  return res.json({ ok: true });
});

/* ---------- Library policies ---------- */

app.get("/api/library-policy", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;
  return res.json({
    borrowingDurationDays: getBorrowingDurationDays(),
    facultyBorrowingDurationDays: getBorrowingDurationDays("faculty_borrowing_duration_days"),
  });
});

app.post("/api/library-policy", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const duration = Number(req.body.borrowingDurationDays);
  const facultyDuration = Number(req.body.facultyBorrowingDurationDays);
  if (!isValidDurationDays(duration) || !isValidDurationDays(facultyDuration)) {
    return res.status(400).json({ error: "Returning durations must be positive whole numbers of days that result in a supported due date." });
  }

  db.prepare(
    "INSERT INTO library_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
  ).run("borrowing_duration_days", String(duration));
  db.prepare(
    "INSERT INTO library_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
  ).run("faculty_borrowing_duration_days", String(facultyDuration));

  const librarian = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  if (librarian) {
    logActivity(
      librarian.name,
      "Policy Update",
      `Set student and visitor returning duration to ${duration} days and faculty and teacher returning duration to ${facultyDuration} days`,
    );
  }
  return res.json({ ok: true, borrowingDurationDays: duration, facultyBorrowingDurationDays: facultyDuration });
});

/* ---------- Transactions ---------- */

app.get("/api/transactions/mine", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const rows = db
    .prepare(
      `SELECT t.*, b.title, b.author, u.name AS user_name, u.school_id
       FROM transactions t
       JOIN books b ON b.id = t.book_id
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ?
       ORDER BY t.id DESC`,
    )
    .all(session.userId);

  return res.json(rows.map(mapTransaction));
});

app.get("/api/transactions", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const status = req.query.status;
  let sql = `SELECT t.*, b.title, b.author, b.isbn, u.name AS user_name, u.school_id, u.phone, u.course, u.user_type
             FROM transactions t JOIN books b ON b.id = t.book_id JOIN users u ON u.id = t.user_id`;
  const params = [];
  if (status) {
    sql += " WHERE t.status = ?";
    params.push(status);
  }
  sql += " ORDER BY t.id DESC";

  const rows = db.prepare(sql).all(...params);
  return res.json(rows.map(mapTransaction));
});

app.get("/api/transactions/user/:userId", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const rows = db
    .prepare(
      `SELECT t.*, b.title, b.author FROM transactions t JOIN books b ON b.id = t.book_id WHERE t.user_id = ? ORDER BY t.id DESC`,
    )
    .all(req.params.userId);

  return res.json(rows.map(mapTransaction));
});

app.post("/api/transactions/borrow", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const bookId = req.body.bookId;
  const book = db.prepare("SELECT * FROM books WHERE id = ? AND is_archived = 0").get(bookId);
  if (!book || book.available <= 1) return res.status(400).json({ error: "Book must have more than one available copy to borrow." });

  const user = db.prepare("SELECT user_type FROM users WHERE id = ?").get(session.userId);
  const borrowDate = todayMMDDYYYY();
  const dueDate = addDaysMMDDYYYY(getDurationForUser(user));

  const result = db
    .prepare(
      `INSERT INTO transactions (user_id, book_id, borrow_date, due_date, created_at, status)
       VALUES (?, ?, ?, ?, NOW(), 'pending')`,
    )
    .run(session.userId, bookId, borrowDate, dueDate);

  db.prepare("DELETE FROM cart_items WHERE user_id = ? AND book_id = ?").run(session.userId, bookId);
  db.prepare("INSERT INTO notifications (user_id, title, body, date, sender_name) VALUES (?, ?, ?, ?, ?)").run(
    session.userId,
    "Borrow Request Submitted",
    `Your request to borrow ${book.title} is waiting for librarian approval.`,
    borrowDate,
    "Library System",
  );

  return res.json({ ok: true, transactionId: result.lastInsertRowid, borrowDate, dueDate });
});

app.post("/api/transactions/:id/approve", async (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
  if (!txn || txn.status !== "pending") return res.status(400).json({ error: "Invalid transaction." });

  const book = db.prepare("SELECT * FROM books WHERE id = ? AND is_archived = 0").get(txn.book_id);
  if (!book || book.available <= 1) return res.status(400).json({ error: "Book must have more than one available copy to borrow." });

  const borrowDate = txn.borrow_date;
  const dueDate = txn.due_date;
  db.prepare("UPDATE transactions SET status = 'borrowed' WHERE id = ?").run(txn.id);
  db.prepare("UPDATE books SET available = available - 1 WHERE id = ?").run(txn.book_id);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(txn.user_id);
  const lib = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);

  db.prepare("INSERT INTO notifications (user_id, title, body, date, sender_name) VALUES (?, ?, ?, ?, ?)").run(
    txn.user_id,
    "Book Borrowing Confirmation",
    `Your borrow request for ${book.title} is approved.`,
    todayMMDDYYYY(),
    lib?.name || "Library System",
  );

  if (lib) logActivity(lib.name, "Borrow Approval", `Approved borrowing of book (${book.title})`);

  if (user?.phone) {
    try {
      await sendSms(
        user.phone,
        `Dear ${user.name}, you successfully borrowed "${book.title}" by ${book.author}. Borrowed: ${borrowDate}. Return by: ${dueDate}.`,
      );
    } catch (_) {
      /* non-fatal */
    }
  }

  return res.json({ ok: true, borrowDate, dueDate });
});

app.post("/api/transactions/:id/decline", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const txn = db.prepare(
    `SELECT t.*, b.title FROM transactions t JOIN books b ON b.id = t.book_id WHERE t.id = ? AND t.status = 'pending'`,
  ).get(req.params.id);
  if (!txn) return res.status(400).json({ error: "Invalid transaction." });

  db.prepare("UPDATE transactions SET status = 'declined' WHERE id = ? AND status = 'pending'").run(req.params.id);
  const librarian = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  db.prepare("INSERT INTO notifications (user_id, title, body, date, sender_name) VALUES (?, ?, ?, ?, ?)").run(
    txn.user_id,
    "Borrow Request Declined",
    `Your request to borrow ${txn.title} was declined.`,
    todayMMDDYYYY(),
    librarian?.name || "Library System",
  );
  return res.json({ ok: true });
});

app.post("/api/transactions/:id/return", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const txn = db.prepare(
    `SELECT t.*, b.title FROM transactions t JOIN books b ON b.id = t.book_id
     WHERE t.id = ? AND t.status IN ('borrowed', 'overdue', 'return_pending')`,
  ).get(req.params.id);
  if (!txn) return res.status(400).json({ error: "This transaction is not currently checked out." });

  const result = db.prepare(
    `UPDATE transactions SET status = 'returned', return_date = ?
     WHERE id = ? AND status IN ('borrowed', 'overdue', 'return_pending')`,
  ).run(todayMMDDYYYY(), txn.id);
  if (!result.changes) return res.status(409).json({ error: "This book has already been returned." });
  db.prepare("UPDATE books SET available = available + 1 WHERE id = ?").run(txn.book_id);

  const lib = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  if (lib) logActivity(lib.name, "Return Approval", `Recorded walk-in return for transaction #${txn.id}`);
  db.prepare("INSERT INTO notifications (user_id, title, body, date, sender_name) VALUES (?, ?, ?, ?, ?)").run(
    txn.user_id,
    "Book Return Confirmed",
    `Your return of ${txn.title} has been recorded.`,
    todayMMDDYYYY(),
    lib?.name || "Library System",
  );

  return res.json({ ok: true });
});

function mapTransaction(t) {
  return {
    id: t.id,
    userId: t.user_id,
    bookId: t.book_id,
    title: t.title,
    author: t.author,
    isbn: t.isbn,
    userName: t.user_name,
    schoolId: t.school_id,
    phone: t.phone,
    course: t.course,
    userType: t.user_type,
    borrowDate: t.borrow_date,
    dueDate: t.due_date,
    createdAt: t.created_at,
    returnDate: t.return_date,
    status: t.status,
  };
}

/* ---------- Users (Admin) ---------- */

app.get("/api/users", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["admin", "librarian"].includes(session.role)) return;

  const status = req.query.status;
  let sql = "SELECT * FROM users WHERE role IN ('member','visitor')";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY name";

  return res.json(db.prepare(sql).all(...params).map(publicUser));
});

app.post("/api/users/:id/approve", async (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role IN ('member','visitor')").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User account not found." });
  if (user.status !== "pending") return res.status(400).json({ error: "Only pending accounts can be approved." });

  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(user.id);
  const message = `Hello ${user.name}, your Golden Gate Library account has been approved by the system administrator. You may now sign in.`;

  try {
    const smsResult = await sendSms(normalizePhone(user.phone), message);
    return res.json({ ok: true, sms: smsResult.mock ? "demo" : "sent" });
  } catch (err) {
    return res.status(502).json({ error: `Account approved, but SMS notification failed: ${err.message}` });
  }
});

app.post("/api/users/:id/deactivate", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const user = db
    .prepare("SELECT id, status FROM users WHERE id = ? AND role IN ('member','visitor')")
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: "User account not found." });
  if (user.status === "deactivated") return res.json({ ok: true, alreadyDeactivated: true });

  const result = db
    .prepare("UPDATE users SET status = 'deactivated' WHERE id = ? AND role IN ('member','visitor')")
    .run(req.params.id);
  if (!result.changes) return res.status(409).json({ error: "User account could not be deactivated." });
  return res.json({ ok: true });
});

app.post("/api/users/:id/activate", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const user = db
    .prepare("SELECT id, status FROM users WHERE id = ? AND role IN ('member','visitor')")
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: "User account not found." });
  if (user.status === "active") return res.json({ ok: true, alreadyActive: true });

  const result = db
    .prepare("UPDATE users SET status = 'active' WHERE id = ? AND role IN ('member','visitor')")
    .run(req.params.id);
  if (!result.changes) return res.status(409).json({ error: "User account could not be activated." });
  return res.json({ ok: true });
});

app.post("/api/librarians", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const { username, name, schoolId, password, email } = req.body;
  if (!username || !name || !password) return res.status(400).json({ error: "Required fields missing." });

  const result = db
    .prepare(
      `INSERT INTO users (username, email, password, name, school_id, user_type, role, status)
       VALUES (?, ?, ?, ?, ?, 'Librarian', 'librarian', 'active')`,
    )
    .run(username, email || `${username}@ggc.edu.ph`, bcrypt.hashSync(password, 10), name, schoolId || null);

  return res.json({ ok: true, id: result.lastInsertRowid });
});

app.get("/api/librarians", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const rows = db.prepare("SELECT id, username, name, school_id, email, status FROM users WHERE role = 'librarian'").all();
  return res.json(rows.map(publicUser));
});

app.post("/api/users/:id/notifications", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  if (!title || !body) return res.status(400).json({ error: "Message title and body are required." });

  const user = db
    .prepare("SELECT id FROM users WHERE id = ? AND role IN ('member','visitor') AND status = 'active'")
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: "Active user account not found." });

  const sender = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  const notification = db.prepare(
    "INSERT INTO notifications (user_id, title, body, date, sender_id, sender_name) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(user.id, title, body, todayMMDDYYYY(), session.userId, sender?.name || "Library System");
  const thread = db.prepare(
    `INSERT INTO contact_messages
      (user_id, user_name, message, sender_id, sender_role, source_notification_id)
     VALUES (?, ?, ?, ?, 'librarian', ?)`,
  ).run(user.id, sender?.name || "Library System", body, session.userId, notification.lastInsertRowid);
  db.prepare("UPDATE contact_messages SET conversation_id = ? WHERE id = ?")
    .run(thread.lastInsertRowid, thread.lastInsertRowid);
  return res.json({ ok: true, threadId: thread.lastInsertRowid });
});

app.post("/api/contact-messages/:id/reply", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "member", "visitor"].includes(session.role)) return;

  const threadId = Number(req.params.id);
  const body = String(req.body.body || "").trim();
  if (!Number.isInteger(threadId) || threadId < 1 || !body || body.length > 500) {
    return res.status(400).json({ error: "A valid message and reply body are required." });
  }

  const thread = db.prepare(
    "SELECT id, user_id FROM contact_messages WHERE id = ? AND conversation_id = id",
  ).get(threadId);
  if (!thread) return res.status(404).json({ error: "The message thread could not be found." });
  if (session.role !== "librarian" && Number(thread.user_id) !== Number(session.userId)) {
    return res.status(403).json({ error: "You do not have access to this message thread." });
  }
  const recipient = session.role === "librarian"
    ? db
      .prepare("SELECT id FROM users WHERE id = ? AND role IN ('member','visitor') AND status = 'active'")
      .get(thread.user_id)
    : null;
  if (session.role === "librarian" && !recipient) {
    return res.status(404).json({ error: "The message sender does not have an active user account." });
  }
  const previousMessage = db.prepare(
    "SELECT id FROM contact_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1",
  ).get(thread.id);
  if (!previousMessage) return res.status(404).json({ error: "The message thread has no messages to reply to." });

  const sender = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  let notificationId = null;
  if (session.role === "librarian") {
    const notification = db.prepare(
      `INSERT INTO notifications
        (user_id, title, body, date, sender_id, sender_name, reply_to_contact_message_id)
       VALUES (?, 'Replied', ?, CURRENT_DATE, ?, ?, ?)`,
    ).run(recipient.id, body, session.userId, sender?.name || "Library System", thread.id);
    notificationId = notification.lastInsertRowid;
  }
  db.prepare(
    `INSERT INTO contact_messages
      (user_id, user_name, message, conversation_id, reply_to_message_id, sender_id, sender_role, source_notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    thread.user_id,
    sender?.name || "Library User",
    body,
    thread.id,
    previousMessage.id,
    session.userId,
    session.role,
    notificationId,
  );
  return res.json({ ok: true });
});

/* ---------- Notifications ---------- */

app.get("/api/librarian/notifications/sent", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const rows = db.prepare(
    `SELECT n.id, n.title, n.body, DATE_FORMAT(n.date, '%Y-%m-%d') AS date,
            DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            n.sender_name, u.name AS recipient_name
     FROM notifications n
     LEFT JOIN contact_messages thread_root
       ON thread_root.source_notification_id = n.id
      AND thread_root.conversation_id = thread_root.id
     JOIN users u ON u.id = n.user_id
     WHERE (
       n.sender_id = ?
       OR (n.sender_id IS NULL AND n.title = 'Message from the Library'
           AND n.sender_name = (SELECT name FROM users WHERE id = ?))
     ) AND n.announcement_id IS NULL
       AND n.reply_to_contact_message_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM contact_messages thread_message
         WHERE thread_message.source_notification_id = n.id
       )
     ORDER BY n.id DESC`,
  ).all(session.userId, session.userId);
  return res.json(rows);
});

app.get("/api/librarian/notifications/system", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const borrowRequests = db.prepare(
    `SELECT t.id, t.borrow_date, t.due_date,
            DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            u.name AS requester_name, u.school_id,
            b.title AS book_title
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     JOIN books b ON b.id = t.book_id
     WHERE t.status = 'pending'
     ORDER BY t.id DESC`,
  ).all();
  const reportRequests = db.prepare(
    `SELECT id, librarian_name, report_type, status,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM report_requests
     WHERE status = 'Request Report'
     ORDER BY id DESC`,
  ).all();
  return res.json({ borrowRequests, reportRequests });
});

app.get("/api/notifications", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const rows = db
    .prepare(
      `SELECT n.id, n.title, n.body, DATE_FORMAT(n.date, '%Y-%m-%d') AS date,
              n.is_read, n.announcement_id, n.reply_to_contact_message_id,
              thread_root.id AS thread_id,
              DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
              COALESCE(n.sender_name, announcement_sender.name) AS sender_name,
              CASE
                WHEN notification_sender.role = 'librarian' OR thread_root.sender_role = 'librarian' THEN 'Librarian'
                WHEN notification_sender.role = 'visitor' OR notification_sender.user_type = 'Visitor' THEN 'Visitor'
                WHEN notification_sender.user_type IN ('Faculty', 'Teacher') THEN 'Faculty'
                WHEN notification_sender.user_type = 'Student' THEN 'Student'
                ELSE NULL
              END AS sender_type
       FROM notifications n
       LEFT JOIN users notification_sender ON notification_sender.id = n.sender_id
       LEFT JOIN announcements linked_announcement ON linked_announcement.id = n.announcement_id
       LEFT JOIN users announcement_sender ON announcement_sender.id = linked_announcement.created_by
       WHERE n.user_id = ? AND n.date <= CURRENT_DATE
       UNION ALL
       SELECT CONCAT('announcement-', a.id) AS id, a.title, a.body,
              DATE_FORMAT(a.publication_date, '%Y-%m-%d') AS date,
              0 AS is_read, a.id AS announcement_id, NULL AS reply_to_contact_message_id,
              NULL AS thread_id, NULL AS created_at,
              publisher.name AS sender_name,
              CASE
                WHEN publisher.role = 'librarian' THEN 'Librarian'
                WHEN publisher.role = 'visitor' OR publisher.user_type = 'Visitor' THEN 'Visitor'
                WHEN publisher.user_type IN ('Faculty', 'Teacher') THEN 'Faculty'
                WHEN publisher.user_type = 'Student' THEN 'Student'
                ELSE NULL
              END AS sender_type
       FROM announcements a
       JOIN users u ON u.id = ?
       LEFT JOIN users publisher ON publisher.id = a.created_by
       WHERE a.publication_date <= CURRENT_DATE
         AND u.status = 'active'
         AND (
           (a.audience = 'everyone' AND u.role IN ('member', 'visitor'))
           OR (a.audience = 'visitors' AND u.role = 'visitor')
           OR (a.audience = 'students' AND u.user_type = 'Student' AND u.role IN ('member', 'visitor'))
           OR (a.audience = 'faculty' AND u.user_type IN ('Faculty', 'Teacher') AND u.role IN ('member', 'visitor'))
         )
         AND NOT EXISTS (
           SELECT 1 FROM notifications existing
           WHERE existing.user_id = u.id AND existing.announcement_id = a.id
         )
       ORDER BY date DESC, id DESC`,
    )
    .all(session.userId, session.userId);

  return res.json(
    rows.map((n) => ({
      id: n.id,
      announcementId: n.announcement_id,
      date: n.date,
      createdAt: n.created_at,
      sender: n.sender_name || "System Notification",
      senderType: n.sender_type,
      title: n.title,
      body: n.body,
      threadId: n.reply_to_contact_message_id || n.thread_id,
      read: !!n.is_read,
    })),
  );
});

app.get("/api/contact-messages", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const rows = db
    .prepare(
      `SELECT root.id, root.user_id, root.user_name, root.message,
              latest.id AS last_message_id,
              latest.user_name AS latest_sender_name,
              CASE
                WHEN latest_sender.role = 'librarian' THEN 'Librarian'
                WHEN latest_sender.role = 'visitor' OR latest_sender.user_type = 'Visitor' THEN 'Visitor'
                WHEN latest_sender.user_type IN ('Faculty', 'Teacher') THEN 'Faculty'
                WHEN latest_sender.user_type = 'Student' THEN 'Student'
                ELSE NULL
              END AS sender_type,
              latest.message AS latest_message,
              latest.sender_role AS latest_sender_role,
              source_notification.title AS notification_title,
              DATE_FORMAT(latest.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM contact_messages root
       JOIN contact_messages latest
         ON latest.id = (
           SELECT candidate.id FROM contact_messages candidate
           WHERE candidate.conversation_id = root.id
           ORDER BY candidate.id DESC LIMIT 1
         )
       LEFT JOIN users latest_sender ON latest_sender.id = latest.sender_id
       LEFT JOIN notifications source_notification ON source_notification.id = root.source_notification_id
       WHERE root.conversation_id = root.id
       ORDER BY latest.id DESC`,
    )
    .all();
  return res.json(rows.map((row) => {
    const { reason } = splitContactMessage(row.message);
    const lastMessage = row.last_message_id === row.id
      ? splitContactMessage(row.latest_message).body
      : row.latest_message;
    return {
      id: `thread-${row.id}-${row.last_message_id}`,
      threadId: row.id,
      contactMessageId: row.id,
      userId: row.user_id,
      from: row.latest_sender_name || row.user_name || "Library User",
      senderType: row.sender_type || (row.latest_sender_role === "librarian" ? "Librarian" : null),
      reason: row.notification_title || reason,
      message: lastMessage,
      date: row.created_at,
      createdAt: row.created_at,
    };
  }));
});

app.get("/api/contact-messages/sent", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["member", "visitor"].includes(session.role)) return;

  const rows = db.prepare(
    `SELECT root.id, latest.message,
            DATE_FORMAT(latest.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM contact_messages root
     JOIN contact_messages latest
       ON latest.id = (
         SELECT candidate.id FROM contact_messages candidate
         WHERE candidate.conversation_id = root.id
         ORDER BY candidate.id DESC LIMIT 1
       )
     WHERE root.user_id = ?
       AND root.conversation_id = root.id
       AND EXISTS (
         SELECT 1 FROM contact_messages authored
         WHERE authored.conversation_id = root.id AND authored.sender_id = ?
       )
     ORDER BY latest.id DESC`,
  ).all(session.userId, session.userId);
  return res.json(rows.map((row) => ({
    id: row.id,
    threadId: row.id,
    message: row.message,
    date: row.created_at,
  })));
});

app.get("/api/contact-messages/:id", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "member", "visitor"].includes(session.role)) return;

  const threadId = Number(req.params.id);
  if (!Number.isInteger(threadId) || threadId < 1) {
    return res.status(400).json({ error: "Invalid message thread." });
  }

  const root = db.prepare(
    `SELECT root.id, root.user_id, root.message, root.user_name,
            source_notification.title AS notification_title
     FROM contact_messages root
     LEFT JOIN notifications source_notification
       ON source_notification.id = root.source_notification_id
     WHERE root.id = ? AND root.conversation_id = root.id`,
  ).get(threadId);
  if (!root) return res.status(404).json({ error: "Message thread not found." });
  if (session.role !== "librarian" && Number(root.user_id) !== Number(session.userId)) {
    return res.status(403).json({ error: "You do not have access to this message thread." });
  }

  const messages = db.prepare(
    `SELECT cm.id, cm.message, cm.sender_role, cm.user_name, cm.reply_to_message_id,
            parent.user_name AS reply_to_sender_name,
            CASE
              WHEN parent_sender.role = 'librarian' THEN 'Librarian'
              WHEN parent_sender.role = 'visitor' OR parent_sender.user_type = 'Visitor' THEN 'Visitor'
              WHEN parent_sender.user_type IN ('Faculty', 'Teacher') THEN 'Faculty'
              WHEN parent_sender.user_type = 'Student' THEN 'Student'
              WHEN parent.sender_role = 'librarian' THEN 'Librarian'
              WHEN parent.sender_role = 'visitor' THEN 'Visitor'
              ELSE NULL
            END AS reply_to_sender_type,
            DATE_FORMAT(cm.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            CASE
              WHEN sender.role = 'librarian' THEN 'Librarian'
              WHEN sender.role = 'visitor' OR sender.user_type = 'Visitor' THEN 'Visitor'
              WHEN sender.user_type IN ('Faculty', 'Teacher') THEN 'Faculty'
              WHEN sender.user_type = 'Student' THEN 'Student'
              WHEN cm.sender_role = 'librarian' THEN 'Librarian'
              WHEN cm.sender_role = 'visitor' THEN 'Visitor'
              ELSE NULL
            END AS sender_type
     FROM contact_messages cm
     LEFT JOIN users sender ON sender.id = cm.sender_id
     LEFT JOIN contact_messages parent ON parent.id = cm.reply_to_message_id
     LEFT JOIN users parent_sender ON parent_sender.id = parent.sender_id
     WHERE cm.conversation_id = ?
     ORDER BY cm.id ASC`,
  ).all(root.id);
  const topic = root.notification_title || splitContactMessage(root.message).reason;
  return res.json({
    id: root.id,
    userId: root.user_id,
    topic,
    messages: messages.map((message) => ({
      id: message.id,
      sender: message.user_name || root.user_name || "Library User",
      senderType: message.sender_type,
      replyTo: message.reply_to_message_id
        ? {
          sender: message.reply_to_sender_name || root.user_name || "Library User",
          senderType: message.reply_to_sender_type,
        }
        : null,
      body: message.id === root.id
        ? splitContactMessage(message.message).body
        : message.message,
      createdAt: message.created_at,
    })),
  });
});

app.put("/api/notifications/:id/read", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const notificationId = String(req.params.id);
  const announcementMatch = /^announcement-(\d+)$/.exec(notificationId);
  if (announcementMatch) {
    const announcementId = Number(announcementMatch[1]);
    db.prepare(
      `INSERT INTO notifications (user_id, title, body, date, announcement_id, is_read, sender_name, created_at)
       SELECT u.id, a.title, a.body, a.publication_date, a.id, 1, publisher.name, NULL
       FROM announcements a
       JOIN users u ON u.id = ?
       LEFT JOIN users publisher ON publisher.id = a.created_by
       WHERE a.id = ?
         AND a.publication_date <= CURRENT_DATE
         AND u.status = 'active'
         AND (
           (a.audience = 'everyone' AND u.role IN ('member', 'visitor'))
           OR (a.audience = 'visitors' AND u.role = 'visitor')
           OR (a.audience = 'students' AND u.user_type = 'Student' AND u.role IN ('member', 'visitor'))
           OR (a.audience = 'faculty' AND u.user_type IN ('Faculty', 'Teacher') AND u.role IN ('member', 'visitor'))
         )
         AND NOT EXISTS (
           SELECT 1 FROM notifications existing
           WHERE existing.user_id = u.id AND existing.announcement_id = a.id
         )`,
    ).run(session.userId, announcementId);

    const notification = db.prepare(
      "SELECT id FROM notifications WHERE user_id = ? AND announcement_id = ?",
    ).get(session.userId, announcementId);
    if (!notification) return res.status(404).json({ error: "Notification not found." });
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
      .run(notification.id, session.userId);
    return res.json({ ok: true });
  }

  if (!/^\d+$/.test(notificationId)) {
    return res.status(400).json({ error: "Invalid notification ID." });
  }
  const notification = db.prepare(
    "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
  ).get(notificationId, session.userId);
  if (!notification) return res.status(404).json({ error: "Notification not found." });
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
    .run(notification.id, session.userId);
  return res.json({ ok: true });
});

app.delete("/api/notifications/:id", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  db.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?").run(req.params.id, session.userId);
  return res.json({ ok: true });
});

/* ---------- Dashboard & Reports ---------- */

app.get("/api/dashboard/stats", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const totalBooks = db.prepare("SELECT COALESCE(SUM(total),0) AS n FROM books WHERE is_archived = 0").get().n;
  const available = db.prepare("SELECT COALESCE(SUM(available),0) AS n FROM books WHERE is_archived = 0").get().n;
  const borrowed = db
    .prepare("SELECT COUNT(*) AS n FROM transactions WHERE status IN ('borrowed','overdue','return_pending')")
    .get().n;
  const overdue = db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status = 'overdue'").get().n;
  const totalUsers = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role IN ('member','visitor') AND status = 'active'").get().n;
  const students = db.prepare("SELECT COUNT(*) AS n FROM users WHERE user_type = 'Student' AND status = 'active'").get().n;
  const faculty = db.prepare("SELECT COUNT(*) AS n FROM users WHERE user_type IN ('Teacher','Faculty') AND status = 'active'").get().n;
  const visitors = db.prepare("SELECT COUNT(*) AS n FROM users WHERE user_type = 'Visitor' AND status = 'active'").get().n;
  const librarians = db.prepare("SELECT COUNT(*) AS n FROM users WHERE user_type = 'Librarian' AND status = 'active'").get().n;
  const administrators = db.prepare("SELECT COUNT(*) AS n FROM users WHERE user_type = 'Administrator' AND status = 'active'").get().n;
  const pendingUsers = db.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'").get().n;

  return res.json({
    totalBooks,
    available,
    borrowed,
    overdue,
    totalUsers,
    students,
    faculty,
    visitors,
    librarians,
    administrators,
    pendingUsers,
    bookBorrowers: borrowed,
  });
});

app.get("/api/reports/:type", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const type = req.params.type;

  if (type === "users") {
    const rows = db
      .prepare("SELECT school_id, name, user_type, course FROM users WHERE role IN ('member','visitor') AND status = 'active'")
      .all();
    return res.json(rows.map((r) => ({ sid: r.school_id, name: r.name, type: r.user_type, course: r.course })));
  }

  if (type === "inventory") {
    const rows = db.prepare("SELECT title, author, available, total FROM books WHERE is_archived = 0 ORDER BY title").all();
    return res.json(rows.map((r) => ({ title: r.title, author: r.author, available: r.available, total: r.total })));
  }

  if (type === "overdue") {
    const rows = db
      .prepare(
        `SELECT u.school_id, u.name, b.title, t.borrow_date, t.due_date, u.phone
         FROM transactions t JOIN users u ON u.id = t.user_id JOIN books b ON b.id = t.book_id
        WHERE t.status IN ('borrowed', 'overdue', 'return_pending')
          AND STR_TO_DATE(t.due_date, '%m/%d/%Y') <= CURDATE()`,
      )
      .all();
    return res.json(
      rows.map((r) => ({
        sid: r.school_id,
        user: r.name,
        book: r.title,
        borrowed: r.borrow_date,
        due: r.due_date,
        phone: r.phone,
      })),
    );
  }

  if (type === "borrowed") {
    const rows = db
      .prepare(
        `SELECT b.title, b.author, COUNT(*) AS count
         FROM transactions t JOIN books b ON b.id = t.book_id
         WHERE t.status IN ('borrowed','overdue')
         GROUP BY b.id ORDER BY count DESC`,
      )
      .all();
    return res.json(rows.map((r) => ({ title: r.title, author: r.author, count: r.count })));
  }

  return res.status(400).json({ error: "Unknown report type." });
});

app.get("/api/activity-log", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const rows = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 100").all();
  return res.json(rows.map((r) => ({ datetime: r.created_at, librarian: r.librarian_name, action: r.action, details: r.details })));
});

app.get("/api/announcements", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const rows = db.prepare(
    `SELECT id, title, body,
            DATE_FORMAT(date, '%Y-%m-%d') AS date, audience,
            DATE_FORMAT(publication_date, '%Y-%m-%d') AS publication_date
     FROM announcements ORDER BY id DESC`,
  ).all();
  return res.json(rows.map((row) => ({
    id: `announcement-${row.id}`,
    announcementId: row.id,
    title: row.title,
    body: row.body,
    date: row.date,
    audience: row.audience,
    publicationDate: row.publication_date,
  })));
});

app.post("/api/announcements", (req, res) => {
  const session = requireSession(req, res);
  if (!session || !["librarian", "admin"].includes(session.role)) return;

  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  const audience = String(req.body.audience || "everyone").trim().toLowerCase();
  const publicationDate = String(req.body.publicationDate || "").trim();
  if (!title || !body || !publicationDate) return res.status(400).json({ error: "Title, message, and publication date are required." });
  if (!["everyone", "students", "faculty", "visitors"].includes(audience)) {
    return res.status(400).json({ error: "Invalid announcement audience." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
    return res.status(400).json({ error: "Publication date must be valid." });
  }
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (publicationDate < todayDate) {
    return res.status(400).json({ error: "Publication date cannot be in the past." });
  }
  const result = db.prepare(
    "INSERT INTO announcements (title, body, date, audience, publication_date, created_by) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(title, body, publicationDate, audience, publicationDate, session.userId);
  const audienceClause = audience === "everyone"
    ? "role IN ('member', 'visitor')"
    : audience === "visitors"
      ? "role = 'visitor'"
      : audience === "faculty"
        ? "role IN ('member', 'visitor') AND user_type IN ('Faculty', 'Teacher')"
        : "role IN ('member', 'visitor') AND user_type = 'Student'";
  const recipients = db.prepare(`SELECT id FROM users WHERE status = 'active' AND ${audienceClause}`).all();
  const sender = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  const notify = db.prepare(
    "INSERT INTO notifications (user_id, title, body, date, announcement_id, sender_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
  );
  recipients.forEach((recipient) => notify.run(
    recipient.id, title, body, publicationDate, result.lastInsertRowid, sender?.name || "Library System",
  ));
  return res.json({ ok: true, id: result.lastInsertRowid });
});

app.put("/api/announcements/:id", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "librarian") return;

  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  const audience = String(req.body.audience || "everyone").trim().toLowerCase();
  const publicationDate = String(req.body.publicationDate || "").trim();
  if (!title || !body || !publicationDate) return res.status(400).json({ error: "Title, message, and publication date are required." });
  if (!["everyone", "students", "faculty", "visitors"].includes(audience)) return res.status(400).json({ error: "Invalid announcement audience." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) return res.status(400).json({ error: "Publication date must be valid." });
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (publicationDate < todayDate) return res.status(400).json({ error: "Publication date cannot be in the past." });

  const announcement = db.prepare("SELECT id FROM announcements WHERE id = ?").get(req.params.id);
  if (!announcement) return res.status(404).json({ error: "Announcement not found." });

  db.prepare("UPDATE announcements SET title = ?, body = ?, date = ?, audience = ?, publication_date = ? WHERE id = ?")
    .run(title, body, publicationDate, audience, publicationDate, req.params.id);
  db.prepare("DELETE FROM notifications WHERE announcement_id = ?").run(req.params.id);

  const audienceClause = audience === "everyone"
    ? "role IN ('member', 'visitor')"
    : audience === "visitors"
      ? "role = 'visitor'"
      : audience === "faculty"
        ? "role IN ('member', 'visitor') AND user_type IN ('Faculty', 'Teacher')"
        : "role IN ('member', 'visitor') AND user_type = 'Student'";
  const recipients = db.prepare(`SELECT id FROM users WHERE status = 'active' AND ${audienceClause}`).all();
  const sender = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  const notify = db.prepare(
    "INSERT INTO notifications (user_id, title, body, date, announcement_id, sender_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
  );
  recipients.forEach((recipient) => notify.run(
    recipient.id, title, body, publicationDate, req.params.id, sender?.name || "Library System",
  ));
  return res.json({ ok: true });
});

app.get("/api/report-requests", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const rows = db.prepare("SELECT * FROM report_requests ORDER BY id DESC").all();
  return res.json(rows);
});

app.get("/api/sms-templates", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const row = db.prepare("SELECT * FROM sms_templates WHERE template_type = ?").get(req.query.type || "Borrow Confirmation");
  return res.json(row || {});
});

app.put("/api/sms-templates", (req, res) => {
  const session = requireSession(req, res);
  if (!session || session.role !== "admin") return;

  const { templateType, body } = req.body;
  db.prepare(
    `INSERT INTO sms_templates (template_type, body) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE body = VALUES(body)`,
  ).run(templateType, body);
  return res.json({ ok: true });
});

app.post("/api/contact", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  let reason = String(req.body.reason || "").trim();
  let message = String(req.body.message || "").trim();
  if (!reason && message) {
    const parsed = splitContactMessage(message);
    if (parsed.reason !== "Message") {
      reason = parsed.reason;
      message = parsed.body;
    }
  }
  if (reason && (!CONTACT_REASONS.includes(reason) || !message)) {
    return res.status(400).json({ error: "Select a contact reason and enter a message." });
  }
  const storedMessage = reason ? `${reason}: ${message}` : message;
  if (!storedMessage) return res.status(400).json({ error: "A message is required." });

  const user = db.prepare("SELECT name FROM users WHERE id = ?").get(session.userId);
  const result = db.prepare(
    `INSERT INTO contact_messages
      (user_id, user_name, message, sender_id, sender_role)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    session.userId,
    user?.name,
    storedMessage,
    session.userId,
    session.role,
  );
  db.prepare("UPDATE contact_messages SET conversation_id = ? WHERE id = ?").run(result.lastInsertRowid, result.lastInsertRowid);
  return res.json({ ok: true, threadId: result.lastInsertRowid });
});

app.get("/api/calendar-events", (_req, res) => {
  const rows = db.prepare("SELECT * FROM calendar_events").all();
  return res.json(rows);
});

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Golden Gate Library System running at http://localhost:${PORT}`);

  // Optionally open Chrome when OPEN_IN_CHROME=true is set in the environment
  try {
    if (process.env.OPEN_IN_CHROME === 'true') {
      const { exec } = require('child_process');
      const url = `http://localhost:${PORT}`;
      // Use Windows 'start' to open Chrome specifically. If Chrome is not on PATH, this will open default browser instead.
      exec(`start chrome "${url}"`, (err) => {
        if (err) console.error('Failed to open Chrome:', err);
      });
    }
  } catch (e) {
    // don't crash the server if opening the browser fails
    // eslint-disable-next-line no-console
    console.error('Browser open check failed:', e && e.message ? e.message : e);
  }
});
