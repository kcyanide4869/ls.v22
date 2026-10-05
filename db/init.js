const { spawnSync } = require('child_process');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'library_system';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_CHARSET = process.env.DB_CHARSET || 'utf8mb4';

const runnerPath = path.resolve(__dirname, 'sql-runner.js');
const connConfig = { host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, charset: DB_CHARSET };

function runQuerySync(sql, values = []) {
  const cfgB = Buffer.from(JSON.stringify(connConfig)).toString('base64');
  const sqlB = Buffer.from(sql).toString('base64');
  const valsB = Buffer.from(JSON.stringify(values)).toString('base64');
  const out = spawnSync(process.execPath, [runnerPath, cfgB, sqlB, valsB], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (out.status !== 0) {
    let err = out.stderr || out.stdout || '';
    try {
      const parsed = JSON.parse(err);
      throw new Error(parsed.error || err);
    } catch (e) {
      throw new Error(err || 'Unknown error from sql-runner');
    }
  }
  const outStr = out.stdout && out.stdout.trim();
  if (!outStr) return [];
  try {
    const parsed = JSON.parse(outStr);
    return parsed.rows;
  } catch (e) {
    throw new Error('Failed to parse runner output: ' + outStr);
  }
}

function normalizeStatement(sql, args) {
  const values = args.length === 0 ? [] : args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  const isNamedParams = values && !Array.isArray(values) && typeof values === 'object';

  if (!isNamedParams || !sql.match(/@[A-Za-z0-9_]+/g)) {
    return { sql, values: Array.isArray(values) ? values : values ? [values] : [] };
  }

  const keys = [...new Set((sql.match(/@[A-Za-z0-9_]+/g) || []).map((key) => key.slice(1)))];
  return {
    sql: sql.replace(/@([A-Za-z0-9_]+)/g, '?'),
    values: keys.map((key) => values[key]),
  };
}

function prepareStatement(sql) {
  return {
    get(...args) {
      const { sql: finalSql, values } = normalizeStatement(sql, args);
      const rows = runQuerySync(finalSql, values);
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
    },
    all(...args) {
      const { sql: finalSql, values } = normalizeStatement(sql, args);
      const rows = runQuerySync(finalSql, values);
      return Array.isArray(rows) ? rows : [];
    },
    run(...args) {
      const { sql: finalSql, values } = normalizeStatement(sql, args);
      const rows = runQuerySync(finalSql, values);
      return {
        lastInsertRowid: rows && rows.insertId ? rows.insertId : 0,
        changes: rows && rows.affectedRows ? rows.affectedRows : 0,
      };
    },
  };
}

function initDb() {
  // Try a simple connectivity test
  try {
    runQuerySync('SELECT 1');
  } catch (err) {
    throw new Error(`Unable to connect to MySQL at ${DB_HOST}:${DB_PORT}. Start MySQL and ensure DB_HOST/DB_PORT/DB_USER/DB_PASSWORD are correct. Original error: ${err && err.message ? err.message : err}`);
  }

  // Create DB if missing using root connection temporarily if env provides root; otherwise assume DB exists
  // (We expect the DB to exist or be created externally.)

  const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone VARCHAR(255),
      school_id VARCHAR(255),
      user_type VARCHAR(255) DEFAULT 'Student',
      course VARCHAR(255),
      role ENUM('member','librarian','admin','visitor') NOT NULL,
      status ENUM('pending','active','deactivated') DEFAULT 'pending',
      fresh_account TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS books (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn VARCHAR(255),
      publication_year INT,
      total INT DEFAULT 1,
      available INT DEFAULT 1,
      is_archived TINYINT(1) NOT NULL DEFAULT 0,
      date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      borrow_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      created_at DATETIME DEFAULT NULL,
      return_date TEXT,
      status ENUM('pending','borrowed','returned','declined','overdue','return_pending') DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS fines (
      id INT PRIMARY KEY AUTO_INCREMENT,
      transaction_id INT NOT NULL,
      amount DECIMAL(10,2) DEFAULT 50.00,
      penalty_status VARCHAR(255) DEFAULT 'issued',
      date_issued TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      payment_status VARCHAR(255) DEFAULT 'pending',
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      title TEXT,
      body TEXT,
      date DATE DEFAULT (CURRENT_DATE),
      is_read TINYINT(1) DEFAULT 0
      ,announcement_id INT,
      sender_id INT DEFAULT NULL,
      sender_name VARCHAR(255) DEFAULT NULL,
      reply_to_contact_message_id INT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title TEXT,
      body TEXT,
      date DATE DEFAULT (CURRENT_DATE),
      audience VARCHAR(32) NOT NULL DEFAULT 'everyone',
      publication_date DATE DEFAULT (CURRENT_DATE),
      created_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title TEXT,
      event_date TEXT,
      event_type TEXT,
      month INT,
      day INT,
      year INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS activity_log (
      id INT PRIMARY KEY AUTO_INCREMENT,
      librarian_name TEXT,
      action TEXT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS sms_templates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      template_type VARCHAR(255) UNIQUE,
      body TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS cart_items (
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      PRIMARY KEY (user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      user_name TEXT,
      message TEXT,
      conversation_id INT DEFAULT NULL,
      reply_to_message_id INT DEFAULT NULL,
      sender_id INT DEFAULT NULL,
      sender_role VARCHAR(32) DEFAULT NULL,
      source_notification_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS report_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      librarian_id INT,
      librarian_name TEXT,
      report_type TEXT,
      status VARCHAR(255) DEFAULT 'Request Report',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS library_settings (
      setting_key VARCHAR(255) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  schema.forEach((s) => runQuerySync(s));
  runQuerySync("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT NULL");
  runQuerySync("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience VARCHAR(32) NOT NULL DEFAULT 'everyone'");
  runQuerySync("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS publication_date DATE DEFAULT (CURRENT_DATE)");
  runQuerySync("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS announcement_id INT");
  runQuerySync("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id INT DEFAULT NULL");
  runQuerySync("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) DEFAULT NULL");
  runQuerySync("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reply_to_contact_message_id INT DEFAULT NULL");
  runQuerySync("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT NULL");
  runQuerySync("ALTER TABLE notifications MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  runQuerySync("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS conversation_id INT DEFAULT NULL");
  runQuerySync("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS reply_to_message_id INT DEFAULT NULL");
  runQuerySync("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS sender_id INT DEFAULT NULL");
  runQuerySync("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(32) DEFAULT NULL");
  runQuerySync("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS source_notification_id INT DEFAULT NULL");
  runQuerySync("UPDATE contact_messages SET conversation_id = id WHERE conversation_id IS NULL");
  runQuerySync(
    `UPDATE contact_messages cm
     LEFT JOIN users sender ON sender.id = cm.user_id
     SET cm.sender_id = COALESCE(cm.sender_id, cm.user_id),
         cm.sender_role = COALESCE(
           cm.sender_role,
           CASE
             WHEN sender.role = 'visitor' THEN 'visitor'
             WHEN sender.role = 'member' THEN 'member'
             ELSE 'member'
           END
         )
     WHERE cm.sender_role IS NULL OR cm.sender_id IS NULL`,
  );
  runQuerySync(
    `INSERT INTO contact_messages
       (user_id, user_name, message, sender_id, sender_role, source_notification_id, created_at)
     SELECT n.user_id, n.sender_name, n.body, sender.id, 'librarian', n.id,
            COALESCE(n.created_at, CURRENT_TIMESTAMP)
     FROM notifications n
     JOIN users sender
       ON sender.id = COALESCE(
         n.sender_id,
         (
           SELECT candidate.id FROM users candidate
           WHERE candidate.role = 'librarian' AND candidate.name = n.sender_name
           ORDER BY candidate.id LIMIT 1
         )
       )
      AND sender.role = 'librarian'
     WHERE n.announcement_id IS NULL
       AND n.reply_to_contact_message_id IS NULL
       AND (n.sender_id IS NOT NULL OR n.title = 'Message from the Library')
       AND NOT EXISTS (
         SELECT 1 FROM contact_messages existing
         WHERE existing.source_notification_id = n.id
       )`,
  );
  runQuerySync("UPDATE contact_messages SET conversation_id = id WHERE conversation_id IS NULL");
  runQuerySync(
    `INSERT INTO contact_messages
       (user_id, user_name, message, conversation_id, reply_to_message_id, sender_id, sender_role, source_notification_id, created_at)
     SELECT original.user_id, reply.sender_name, reply.body, original.id, original.id,
            reply.sender_id, 'librarian', reply.id, COALESCE(reply.created_at, CURRENT_TIMESTAMP)
     FROM notifications reply
     JOIN contact_messages original ON original.id = reply.reply_to_contact_message_id
     WHERE reply.reply_to_contact_message_id IS NOT NULL
       AND original.conversation_id = original.id
       AND NOT EXISTS (
         SELECT 1 FROM contact_messages existing
         WHERE existing.source_notification_id = reply.id
            OR (
              existing.conversation_id = original.id
              AND existing.sender_id = reply.sender_id
              AND existing.sender_role = 'librarian'
              AND existing.message = reply.body
              AND ABS(TIMESTAMPDIFF(SECOND, existing.created_at, reply.created_at)) <= 5
            )
       )`,
  );
  runQuerySync(
    "INSERT IGNORE INTO library_settings (setting_key, setting_value) VALUES ('borrowing_duration_days', '4')",
  );
  runQuerySync(
    "INSERT IGNORE INTO library_settings (setting_key, setting_value) VALUES ('faculty_borrowing_duration_days', '7')",
  );
  runQuerySync(
    "UPDATE library_settings SET setting_value = '4' WHERE setting_key = 'borrowing_duration_days' AND setting_value NOT REGEXP '^[1-9][0-9]*$'",
  );
  runQuerySync(
    "UPDATE library_settings SET setting_value = '7' WHERE setting_key = 'faculty_borrowing_duration_days' AND setting_value NOT REGEXP '^[1-9][0-9]*$'",
  );
  runQuerySync("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending','borrowed','returned','declined','overdue','return_pending') DEFAULT 'pending'");
  const freshAccountColumn = runQuerySync(
    "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = ? AND table_name = 'users' AND column_name = 'fresh_account'",
    [DB_NAME],
  )[0]?.c;
  if (!Number(freshAccountColumn)) {
    runQuerySync("ALTER TABLE users ADD COLUMN fresh_account TINYINT(1) NOT NULL DEFAULT 0 AFTER status");
  }
  const archivedBookColumn = runQuerySync(
    "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = ? AND table_name = 'books' AND column_name = 'is_archived'",
    [DB_NAME],
  )[0]?.c;
  if (!Number(archivedBookColumn)) {
    runQuerySync("ALTER TABLE books ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0 AFTER available");
  }

  const wrapper = {
    prepare: (sql) => prepareStatement(sql),
    exec: (sql) => runQuerySync(sql),
    pragma: () => undefined,
    close: () => undefined,
  };

  const userCount = wrapper.exec("SELECT COUNT(*) AS c FROM users")[0]?.c || 0;
  if (userCount === 0) {
    seed(wrapper);
  }
  const currentBookIsbns = [
    ["9780143035008", "Anna Karenina"],
    ["9780061120084", "To Kill a Mockingbird"],
    ["9780451524935", "1984"],
    ["9780141439518", "Pride and Prejudice"],
    ["9780743273565", "The Great Gatsby"],
    ["9780143039990", "War and Peace"],
    ["9780316769488", "The Catcher in the Rye"],
    ["9780140437980", "A Study In Scarlet"],
    ["9789715081238", "Filipino"],
    ["9780140439212", "Sign Of The Four"],
  ];
  const updateBookIsbn = wrapper.prepare("UPDATE books SET isbn = ? WHERE title = ? AND (isbn IS NULL OR isbn = '')");
  currentBookIsbns.forEach(([isbn, title]) => updateBookIsbn.run(isbn, title));
  updateDemoMembers(wrapper);
  wrapper.exec("UPDATE books SET available = 1 WHERE available = 0");

  console.log(`Database backend: MySQL at ${DB_HOST}:${DB_PORT} (DB_NAME=${DB_NAME}, DB_USER=${DB_USER})`);

  return wrapper;
}

function updateDemoMembers(db) {
  const updateUser = db.prepare(
    "UPDATE users SET username = ?, email = ?, password = ?, name = ? WHERE school_id = ? AND role = 'member'",
  );
  const members = [
    ["brendant", "brendant@ggc.edu.ph", "ggcbrendant", "brendant", "CET234"],
    ["lorenz", "lorenz@ggc.edu.ph", "ggclorenz", "lorenz", "CET345"],
    ["clarise", "clarise@ggc.edu.ph", "ggcclarise", "clarise", "CET456"],
  ];

  members.forEach(([username, email, password, name, schoolId]) => {
    updateUser.run(username, email, bcrypt.hashSync(password, 10), name, schoolId);
  });
}

function seed(db) {
  const hash = (password) => bcrypt.hashSync(password, 10);

  const insertUser = db.prepare("INSERT INTO users (username, email, password, name, phone, school_id, user_type, course, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

  const users = [
    { username: "admin", email: "admin@ggc.edu.ph", password: hash("ggcadmin"), name: "System Admin", phone: "+639171111111", school_id: null, user_type: "Administrator", course: null, role: "admin", status: "active" },
    { username: "librarian", email: "librarian@ggc.edu.ph", password: hash("ggclib"), name: "Roberto Villanueva", phone: "+639172222222", school_id: "LIB001", user_type: "Librarian", course: null, role: "librarian", status: "active" },
    { username: "librarian2", email: "angela@ggc.edu.ph", password: hash("ggclib"), name: "Angela Ramirez", phone: "+639173333333", school_id: "LIB002", user_type: "Librarian", course: null, role: "librarian", status: "active" },
    { username: "kudo", email: "kudo@ggc.edu.ph", password: hash("ggckudo"), name: "kudo", phone: "+639174444444", school_id: "CET123", user_type: "Student", course: "BSIT", role: "member", status: "active" },
    { username: "brendant", email: "brendant@ggc.edu.ph", password: hash("ggcbrendant"), name: "brendant", phone: "+639175555555", school_id: "CET234", user_type: "Student", course: "BSIT", role: "member", status: "active" },
    { username: "lorenz", email: "lorenz@ggc.edu.ph", password: hash("ggclorenz"), name: "lorenz", phone: "+639176666666", school_id: "CET345", user_type: "Teacher", course: "BSIT", role: "member", status: "active" },
    { username: "clarise", email: "clarise@ggc.edu.ph", password: hash("ggcclarise"), name: "clarise", phone: "+639177777777", school_id: "CET456", user_type: "Student", course: "BSIT", role: "member", status: "active" },
    { username: "pending1", email: "newuser@ggc.edu.ph", password: hash("Member@123"), name: "New Applicant", phone: "+639178888888", school_id: "CET789", user_type: "Student", course: "BSIT", role: "member", status: "pending" },
  ];

  users.forEach((user) => insertUser.run(user.username, user.email, user.password, user.name, user.phone, user.school_id, user.user_type, user.course, user.role, user.status));

  const books = [
    ["Anna Karenina", "Leo Tolstoy", "9780143035008", 12, 9],
    ["To Kill a Mockingbird", "Harper Lee", "9780061120084", 10, 5],
    ["1984", "George Orwell", "9780451524935", 8, 3],
    ["Pride and Prejudice", "Jane Austen", "9780141439518", 19, 15],
    ["The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", 8, 3],
    ["War and Peace", "Leo Tolstoy", "9780143039990", 4, 2],
    ["The Catcher in the Rye", "J.D. Salinger", "9780316769488", 23, 11],
  ];

  const insertBook = db.prepare("INSERT INTO books (title, author, isbn, total, available) VALUES (?, ?, ?, ?, ?)");
  books.forEach((book) => insertBook.run(...book));

  const memberId = db.prepare("SELECT id FROM users WHERE email = ?").get("kudo@ggc.edu.ph").id;
  const bookIds = db.prepare("SELECT id FROM books ORDER BY id").all().map((row) => row.id);
  const insertTxn = db.prepare(`
    INSERT INTO transactions (user_id, book_id, borrow_date, due_date, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertTxn.run(memberId, bookIds[0], "04/16/2026", "04/19/2026", "borrowed");
  insertTxn.run(memberId, bookIds[1], "04/11/2026", "04/14/2026", "overdue");
  insertTxn.run(memberId, bookIds[2], "04/09/2026", "04/12/2026", "overdue");
  insertTxn.run(memberId, bookIds[3], "04/08/2026", "04/11/2026", "returned");

  const pendingUsers = db.prepare("SELECT id, name, school_id FROM users WHERE status = 'pending'").all();
  pendingUsers.forEach((user) => {
    insertTxn.run(user.id, bookIds[4], "04/16/2026", "04/19/2026", "pending");
  });

  const insertNotif = db.prepare(
    "INSERT INTO notifications (user_id, title, body, date, sender_name, created_at) VALUES (?, ?, ?, ?, ?, NULL)",
  );
  insertNotif.run(memberId, "Book Borrowing Confirmation", "Your borrow request for Anna Karenina is confirmed.", "2026-04-16", "Library System");
  insertNotif.run(memberId, "Overdue Book Reminder", "Please return overdue materials.", "2026-04-14", "Library System");
  insertNotif.run(memberId, "Due Date Reminder", "Friendly reminder — due date approaching.", "2026-04-12", "Library System");

  const insertLog = db.prepare("INSERT INTO activity_log (librarian_name, action, details, created_at) VALUES (?, ?, ?, ?)");
  [
    ["Roberto Villanueva", "Login", "logged in successfully", "2026-04-16 10:00:00"],
    ["Angela Ramirez", "Login", "logged in successfully", "2026-04-16 08:30:00"],
    ["Roberto Villanueva", "Borrow Approval", "Approved borrowing of book (Anna Karenina)", "2026-04-16 08:00:00"],
    ["Angela Ramirez", "Catalog Update", "Added new book (English Literature Basics)", "2026-04-16 07:00:00"],
    ["Roberto Villanueva", "Log out", "logged out of the system", "2026-04-15 14:00:00"],
  ].forEach((row) => insertLog.run(...row));

  db.prepare("INSERT INTO sms_templates (template_type, body) VALUES (?, ?)").run(
    "Borrow Confirmation",
    'Dear [Username], You have successfully borrowed the book: "[Book Title]" by [Author]. Date Borrowed: [Borrow Date]. Return Date: [Return Date]. Thank you for using the Golden Gate Colleges Library System.'
  );

  db.prepare("INSERT INTO report_requests (librarian_name, report_type, status) VALUES (?, ?, ?)").run("Roberto Villanueva", "User Report", "Request Report");
  db.prepare("INSERT INTO report_requests (librarian_name, report_type, status) VALUES (?, ?, ?)").run("Angela Ramirez", "Book Inventory", "Approved");

  db.prepare("INSERT INTO calendar_events (title, event_type, month, day, year) VALUES (?, ?, ?, ?, ?)").run("Holiday", "holiday", 4, 9, 2026);
  db.prepare("INSERT INTO calendar_events (title, event_type, month, day, year) VALUES (?, ?, ?, ?, ?)").run("Closed", "closed", 4, 5, 2026);
}

module.exports = { initDb, DB_NAME };
