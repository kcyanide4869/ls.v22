(function () {
  "use strict";

  const BOOKS = [
    { id: "1", title: "Anna Karenina", author: "Leo Tolstoy", isbn: "9780143035008", avail: 9, total: 12, categories: ["Fiction", "Literature"] },
    { id: "2", title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061120084", avail: 5, total: 10, categories: ["Fiction", "Literature"] },
    { id: "3", title: "1984", author: "George Orwell", isbn: "9780451524935", avail: 3, total: 8, categories: ["Fiction", "Science", "Technology"] },
    { id: "4", title: "Pride and Prejudice", author: "Jane Austen", isbn: "9780141439518", avail: 15, total: 19, categories: ["Fiction", "Literature"] },
    { id: "5", title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", avail: 3, total: 8, categories: ["Fiction", "Literature"] },
    { id: "6", title: "War and Peace", author: "Leo Tolstoy", isbn: "9780143039990", avail: 2, total: 4, categories: ["Fiction", "History", "Literature"] },
    { id: "7", title: "The Catcher in the Rye", author: "J.D. Salinger", isbn: "9780316769488", avail: 11, total: 23, categories: ["Fiction", "Literature"] },
  ];

  function categoriesForBook(title) {
    const normalizedTitle = String(title || "").toLowerCase();
    if (normalizedTitle === "anna karenina") return ["Fiction", "Literature"];
    if (normalizedTitle === "to kill a mockingbird") return ["Fiction", "Literature"];
    if (normalizedTitle === "1984") return ["Fiction", "Science", "Technology"];
    if (normalizedTitle === "pride and prejudice") return ["Fiction", "Literature"];
    if (normalizedTitle === "the great gatsby") return ["Fiction", "Literature"];
    if (normalizedTitle === "war and peace") return ["Fiction", "History", "Literature"];
    if (normalizedTitle === "the catcher in the rye") return ["Fiction", "Literature"];
    if (normalizedTitle === "a study in scarlet" || normalizedTitle === "sign of the four") return ["Fiction", "Literature"];
    if (normalizedTitle === "bible") return ["Non-fiction", "Reference"];
    if (normalizedTitle === "capstone project guide") return ["Education", "Reference"];
    if (normalizedTitle === "english" || normalizedTitle === "filipino") return ["Education", "Literature"];
    return [];
  }

  function renderMemberCategories() {
    qsa(".member-category-card").forEach((button) => {
      const active = button.getAttribute("data-catalog-category") === state.catalogCategory;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  const LIB_APPROVAL_ROWS = [
    { user: "kudo", sid: "CET 123", bookId: "1", book: "Anna Karenina", author: "Leo Tolstoy" },
    { user: "brendant", sid: "CET 234", bookId: "2", book: "To Kill a Mockingbird", author: "Harper Lee" },
    { user: "lorenz", sid: "CET 345", bookId: "4", book: "Pride and Prejudice", author: "Jane Austen" },
    { user: "clarise", sid: "CET 456", bookId: "5", book: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  ];

  const LIB_USERS = LIB_APPROVAL_ROWS.map((r) => ({ name: r.user, sid: r.sid }));

  const ADMIN_USERS = [
    { sid: "CET 123", name: "kudo", type: "Student", course: "BSIT" },
    { sid: "CET 234", name: "brendant", type: "Student", course: "BSIT" },
    { sid: "CET 345", name: "lorenz", type: "Teacher", course: "BSIT" },
    { sid: "CET 456", name: "clarise", type: "Student", course: "BSIT" },
  ];

  const ACTIVITY_LOG = [
    ["04/16/2026 10:00 AM", "Roberto Villanueva", "Login", "logged in successfully"],
    ["04/16/2026 08:30 AM", "Angela Ramirez", "Login", "logged in successfully"],
    ["04/16/2026 08:00 AM", "Roberto Villanueva", "Borrow Approval", "Approved borrowing of book (Anna Karenina)"],
    ["04/16/2026 07:00 AM", "Angela Ramirez", "Catalog Update", "Added new book (English Literature Basics)"],
    ["04/15/2026 02:00 PM", "Roberto Villanueva", "Log out", "logged out of the system"],
  ];

  const DEMO_CREDENTIALS = {
    member: {
      name: "kudo",
      schoolId: "CET123",
      password: "ggckudo",
    },
    librarian: {
      username: "librarian",
      password: "ggclib",
    },
    admin: {
      username: "admin",
      password: "ggcadmin",
    },
  };

  /** @type {{ cart: Set<string>, borrowed: { bookId:string, borrowed:string, due:string, user?:string }[], overdueRows: object[], notifications:{id?:string|number,announcementId?:string|number|null,createdAt?:string|null,sender?:string|null,date:string,title:string,body:string,read?:boolean}[], sentMessages:{id?:string|number,date:string,message:string}[], notificationFilter:string, memberTransactions:object[], historyUsers:object[], txn:{title:string,author:string,date:string,status:string}[], pendingApprove:typeof LIB_APPROVAL_ROWS, pendingReturns:object[] }} */
  const state = {
    cart: new Set(),
    borrowed: [
      { bookId: "1", borrowed: "04/16/2026", due: "04/19/2026" },
      { bookId: "2", borrowed: "04/11/2026", due: "04/14/2026" },
      { bookId: "3", borrowed: "04/9/2026", due: "04/12/2026" },
      { bookId: "4", borrowed: "04/8/2026", due: "04/11/2026" },
    ],
    overdueRows: [],
    notifications: [
      { date: "04/16/2026", title: "Borrow Request Approved", body: "Your request to borrow Anna Karenina was approved.", read: false },
      { date: "04/14/2026", title: "Overdue Book Reminder", body: "Please return overdue materials.", read: false },
      { date: "04/12/2026", title: "Overdue Book Reminder", body: "Friendly reminder — due date approaching.", read: false },
      { date: "04/11/2026", title: "Overdue Book Reminder", body: "Return books to avoid penalties.", read: false },
    ],
    sentMessages: [],
    notificationFilter: "all",
    memberTransactions: [],
    txn: [],
    pendingApprove: [],
    pendingReturns: [],
    historyUsers: [],
    currentMemberName: "Member Demo",
    currentMemberPhone: "",
    composedMemberMessage: "",
    composedMemberReason: "",
    authToken: "",
    currentUser: null,
    libInbox: [],
    libReadNotificationIds: new Set(),
    libNotificationFilter: "all",
    pendingMemberSignup: null,
    adminUsers: [],
    adminUserStatus: "pending",
    libraryPolicyDuration: 4,
    facultyLibraryPolicyDuration: 4,
    activeView: "home",
    catalogCategory: "All Books",
    catalogCategoriesOpen: false,
    contactSectionsOpen: false,
  };

  const ADMIN_DASHBOARD_REFRESH_MS = 30 * 1000;
  let adminDashboardRefreshTimer = null;
  let adminDashboardRefreshInFlight = false;
  let librarianDashboardRefreshTimer = null;
  let librarianDashboardRefreshInFlight = false;

  rebuildTransactions();

  const els = {
    modalRoot: document.getElementById("modal-root"),
    modalBody: document.getElementById("modal-body"),
    chromeRoot: document.getElementById("chrome-root"),
  };

  const STANDALONE_ENTRY_VIEWS = {
    "user.html": "member-catalog",
    "librarian.html": "lib-dashboard",
    "admin.html": "adm-dashboard",
  };
  const ROLE_PAGES = {
    member: "user.html",
    visitor: "user.html",
    librarian: "librarian.html",
    admin: "admin.html",
  };
  const ROLE_DESTINATIONS = {
    member: "member-catalog",
    visitor: "member-catalog",
    librarian: "lib-dashboard",
    admin: "adm-dashboard",
  };

  function standaloneEntryView() {
    const fileName = String(window.location.pathname || "").split("/").pop().toLowerCase();
    return STANDALONE_ENTRY_VIEWS[fileName] || "";
  }

  function renderMemberProfile() {
    const form = qs("#member-profile-form");
    if (!form) return;
    const name = String(state.currentUser?.name || state.currentMemberName || "Member Demo").trim();
    const schoolId = String(state.currentUser?.schoolId || state.currentUser?.sid || "").trim();
    const phone = String(state.currentUser?.phone || state.currentMemberPhone || "").trim();
    const email = String(state.currentUser?.email || "").trim();
    form.elements.name.value = name;
    form.elements.schoolId.value = schoolId;
    form.elements.phone.value = phone;
    form.elements.email.value = email;
    form.elements.currentPassword.value = "";
    form.elements.newPassword.value = "";
    form.elements.confirmPassword.value = "";
  }

  function restoreStandaloneSession() {
    if (!standaloneEntryView()) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("ggc-library-session") || "null");
      if (!saved?.token || !saved.user) return;
      state.authToken = saved.token;
      state.currentUser = saved.user;
      state.currentMemberName = saved.user.name || "Member";
      state.currentMemberPhone = saved.user.phone || "";
      if (saved.user.role === "member" || saved.user.role === "visitor") {
        if (saved.user.freshAccount) resetFreshMemberState();
        restoreMemberCart();
      }
    } catch (_ignored) {
      sessionStorage.removeItem("ggc-library-session");
    }
  }

  function continueAfterLogin(role, destination) {
    sessionStorage.setItem(
      "ggc-library-session",
      JSON.stringify({ token: state.authToken, user: state.currentUser }),
    );
    if (!document.getElementById("view-" + destination) && ROLE_PAGES[role]) {
      window.location.href = ROLE_PAGES[role];
      return false;
    }
    navigate(destination);
    return true;
  }

  restoreStandaloneSession();

  const ASSET_LOGO = "assets/extract-3361.png";
  const GGC_TITLE = "Web-Based Library System With Auto SMS Notification For Golden Gate Colleges";
  const API_BASES = [window.location.protocol === "file:" ? "http://localhost:5500/api" : "/api"];

  function redirectAfterSessionExpiry() {
    state.authToken = "";
    state.currentUser = null;
    sessionStorage.removeItem("ggc-library-session");
    if (document.getElementById("view-login-pick")) {
      navigate("login-pick");
      return;
    }
    window.location.href = "index.html";
  }

  async function postJson(path, payload) {
    const headers = { "Content-Type": "application/json" };
    if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
    let lastError;
    for (const base of API_BASES) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401 && path !== "/auth/login") {
            redirectAfterSessionExpiry();
            throw new Error("Session expired.");
          }

          async function putJson(path, payload) {
            const headers = { "Content-Type": "application/json" };
            if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
            const res = await fetch(`${API_BASES[0]}${path}`, {
              method: "PUT",
              headers,
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
            return data;
          }
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
      } catch (err) {
        lastError = err;
        if (err instanceof Error && !/Failed to fetch|NetworkError|Load failed/i.test(err.message)) throw err;
      }
    }
    throw new Error(`Cannot connect to the library server at http://localhost:5500. ${lastError?.message || ""}`.trim());
  }

  async function putJson(path, payload) {
    const headers = { "Content-Type": "application/json" };
    if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
    let lastError;
    for (const base of API_BASES) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            redirectAfterSessionExpiry();
            throw new Error("Session expired.");
          }
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
      } catch (err) {
        lastError = err;
        if (err instanceof Error && !/Failed to fetch|NetworkError|Load failed/i.test(err.message)) throw err;
      }
    }
    throw new Error(`Cannot connect to the library server at http://localhost:5500. ${lastError?.message || ""}`.trim());
  }

  async function getJson(path) {
    const headers = {};
    if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
    let lastError;
    let lastHttpError;
    for (const base of API_BASES) {
      try {
        const res = await fetch(`${base}${path}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            redirectAfterSessionExpiry();
            throw new Error("Session expired.");
          }
          if (res.status === 404 || res.status === 405) {
            lastHttpError = new Error(data.error || `Request failed (${res.status})`);
            lastError = lastHttpError;
            continue;
          }
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
      } catch (err) {
        lastError = err;
        if (err instanceof Error && !/Failed to fetch|NetworkError|Load failed/i.test(err.message)) throw err;
      }
    }
    if (lastHttpError) throw lastHttpError;
    throw new Error(`Cannot connect to the library server at http://localhost:5500. ${lastError?.message || ""}`.trim());
  }

  async function deleteJson(path) {
    const headers = {};
    if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
    let lastError;
    for (const base of API_BASES) {
      try {
        const res = await fetch(`${base}${path}`, { method: "DELETE", headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            redirectAfterSessionExpiry();
            throw new Error("Session expired.");
          }
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
      } catch (err) {
        lastError = err;
        if (err instanceof Error && !/Failed to fetch|NetworkError|Load failed/i.test(err.message)) throw err;
      }
    }
    throw new Error(`Cannot connect to the library server at http://localhost:5500. ${lastError?.message || ""}`.trim());
  }

  async function loadPendingTransactions(activeTab = "borrow") {
    if (!state.authToken || state.currentUser?.role !== "librarian") return;
    const [rows, borrowedRows, overdueRows, legacyReturnRows, users] = await Promise.all([
      getJson("/transactions?status=pending"),
      getJson("/transactions?status=borrowed"),
      getJson("/transactions?status=overdue"),
      getJson("/transactions?status=return_pending"),
      getJson("/users?status=active"),
    ]);
    state.pendingApprove = rows.map((r) => ({
      transactionId: r.id,
      user: r.userName,
      sid: r.schoolId,
      course: r.course || "N/A",
      userType: r.userType || "N/A",
      bookId: String(r.bookId),
      book: r.title,
      author: r.author,
    }));
    state.pendingReturns = [...borrowedRows, ...overdueRows, ...legacyReturnRows]
      .map((r) => ({
        transactionId: r.id,
        user: r.userName,
        sid: r.schoolId,
        bookId: String(r.bookId),
        book: r.title,
        isbn: r.isbn || "N/A",
        author: r.author,
        course: r.course || "N/A",
        userType: r.userType || "N/A",
        status: r.status,
      }))
      .sort((a, b) => Number(b.transactionId) - Number(a.transactionId));
    state.historyUsers = users.map((user) => ({
      id: user.id,
      sid: user.schoolId,
      name: user.name,
      course: user.course,
      userType: user.userType,
      role: user.role,
    }));
    renderLibBorrowTabs(activeTab);
  }

  async function loadLibraryPolicy() {
    if (!state.authToken || state.currentUser?.role !== "librarian") return;
    const policy = await getJson("/library-policy");
    state.libraryPolicyDuration = Number(policy.borrowingDurationDays);
    state.facultyLibraryPolicyDuration = Number(policy.facultyBorrowingDurationDays);
    const select = qs("#lib-borrowing-duration");
    const facultySelect = qs("#lib-faculty-borrowing-duration");
    if (select) select.value = String(state.libraryPolicyDuration);
    if (facultySelect) facultySelect.value = String(state.facultyLibraryPolicyDuration);
  }

  async function loadLibrarianOverdue() {
    if (!state.authToken || state.currentUser?.role !== "librarian") {
      state.overdueRows = [];
      renderLibOverdue();
      return;
    }
    const rows = await getJson("/reports/overdue");
    if (!Array.isArray(rows)) throw new Error("Invalid overdue report data received from the server.");
    state.overdueRows = rows;
    renderLibOverdue();
  }

  async function loadLibrarianInbox() {
    if (!state.authToken || state.currentUser?.role !== "librarian") {
      state.libInbox = [];
      state.libReadNotificationIds = new Set();
      renderLibrarianNotifications();
      renderLibInbox();
      renderLibAnnouncements();
      updateLibrarianNotificationBell();
      return;
    }
    const readKey = `ggc-librarian-read-${state.currentUser.id}`;
    let readIds = [];
    try {
      readIds = JSON.parse(localStorage.getItem(readKey) || "[]");
    } catch (_ignored) {
      readIds = [];
    }
    state.libReadNotificationIds = new Set(Array.isArray(readIds) ? readIds : []);
    const [messages, announcements, sentMessages, systemNotifications] = await Promise.all([
      getJson("/contact-messages"),
      getJson("/announcements"),
      getJson("/librarian/notifications/sent"),
      getJson("/librarian/notifications/system"),
    ]);
    if (
      !Array.isArray(messages) ||
      !Array.isArray(announcements) ||
      !Array.isArray(sentMessages) ||
      !Array.isArray(systemNotifications?.borrowRequests) ||
      !Array.isArray(systemNotifications?.reportRequests)
    ) {
      throw new Error("Invalid notification data received from the server.");
    }
    state.libInbox = [
      ...messages.map((message) => ({
        id: message.id,
        threadId: message.threadId,
        contactMessageId: message.contactMessageId,
        recipientUserId: message.userId,
        senderType: message.senderType,
        date: message.date,
        createdAt: message.createdAt,
        from: message.from,
        kind: message.senderType === "Librarian" ? "Sent" : "Received",
        title: message.reason || "Message",
        excerpt: message.message,
      })),
      ...sentMessages.map((message) => ({
        id: `sent-${message.id}`,
        sourceId: message.id,
        date: message.date,
        createdAt: message.created_at,
        from: message.sender_name || state.currentUser?.name || "Librarian",
        to: message.recipient_name,
        kind: "Sent",
        title: message.title || "Message from the Library",
        excerpt: message.body,
      })),
      ...systemNotifications.borrowRequests.map((request) => ({
        id: `system-borrow-${request.id}`,
        date: request.borrow_date,
        createdAt: request.created_at,
        from: "Library System",
        kind: "System",
        title: "Borrow Request",
        source: "Borrowing",
        excerpt: `${request.requester_name} (${request.school_id || "No ID"}) requested "${request.book_title}".`,
      })),
      ...systemNotifications.reportRequests.map((request) => ({
        id: `system-report-${request.id}`,
        date: request.created_at,
        createdAt: request.created_at,
        from: "Library System",
        kind: "System",
        title: "Report Generation Request",
        source: "Report",
        excerpt: `${request.report_type || "Report"} request — ${request.status || "Pending"}.`,
      })),
      ...announcements.map((announcement) => ({
        id: announcement.id,
        announcementId: announcement.announcementId,
        date: announcement.date,
        from: "Library",
        kind: "Announcement",
        title: announcement.title,
        audience: announcement.audience,
        publicationDate: announcement.publicationDate,
        excerpt: announcement.body,
      })),
    ].sort(compareNotificationRecency);
    renderLibInbox();
    renderLibAnnouncements();
    renderLibrarianNotifications();
  }

  async function loadMemberTransactions() {
    if (!state.authToken || !["member", "visitor"].includes(state.currentUser?.role)) return;
    const rows = await getJson("/transactions/mine");
    if (!Array.isArray(rows)) throw new Error("Invalid transaction data received from the server.");
    state.memberTransactions = rows;

    state.borrowed = rows
      .filter((transaction) => ["borrowed", "overdue", "return_pending"].includes(transaction.status))
      .map((transaction) => ({
        transactionId: transaction.id,
        bookId: String(transaction.bookId),
        borrowed: transaction.borrowDate,
        due: transaction.dueDate,
      }));

    state.pendingApprove = rows
      .filter((transaction) => transaction.status === "pending")
      .map((transaction) => ({
        transactionId: transaction.id,
        memberRequest: true,
        user: state.currentUser.name,
        sid: state.currentUser.schoolId,
        bookId: String(transaction.bookId),
        book: transaction.title,
        author: transaction.author,
      }));

  }

  async function loadMemberNotifications() {
    if (!state.authToken || !["member", "visitor"].includes(state.currentUser?.role)) return;
    const rows = await getJson("/notifications");
    if (!Array.isArray(rows)) throw new Error("Invalid notification data received from the server.");
    state.notifications = rows;
  }

  async function loadMemberSentMessages() {
    if (!state.authToken || !["member", "visitor"].includes(state.currentUser?.role)) {
      state.sentMessages = [];
      return;
    }
    const rows = await getJson("/contact-messages/sent");
    if (!Array.isArray(rows)) throw new Error("Invalid sent message data received from the server.");
    state.sentMessages = rows;
  }

  async function loadAdminUsers(status = state.adminUserStatus) {
    if (!state.authToken || state.currentUser?.role !== "admin") return;
    state.adminUserStatus = status;
    const rows = await getJson(status && status !== "all" ? `/users?status=${encodeURIComponent(status)}` : "/users");
    if (!Array.isArray(rows)) throw new Error("Invalid user data received from the server.");
    state.adminUsers = rows;
    renderAdmUsers();
  }

  function applyDashboardStats(stats, prefix = "adm") {
    const totalBooks = Number(stats.totalBooks) || 0;
    const availableBooks = Number(stats.available) || 0;
    const borrowed = Number(stats.borrowed) || 0;
    const overdue = Number(stats.overdue) || 0;
    const librarians = Number(stats.librarians) || 0;
    const students = Number(stats.students) || 0;
    const faculty = Number(stats.faculty) || 0;
    const visitors = Number(stats.visitors) || 0;
    const administrators = Number(stats.administrators) || 0;
    const booksInChart = prefix === "adm" ? availableBooks : totalBooks;

    const values = {
      [`${prefix}-total-books`]: totalBooks,
      [`${prefix}-total-users`]: Number(stats.totalUsers) || 0,
      [`${prefix}-borrowed-books`]: borrowed,
      [`${prefix}-overdue-books`]: overdue,
      [`${prefix}-books-legend`]: booksInChart,
      [`${prefix}-borrowed-legend`]: borrowed,
      [`${prefix}-overdue-legend`]: overdue,
      [`${prefix}-librarians-legend`]: librarians,
      [`${prefix}-students-legend`]: students,
      [`${prefix}-faculty-legend`]: faculty,
      [`${prefix}-visitors-legend`]: visitors,
      [`${prefix}-administrators-legend`]: administrators,
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value.toLocaleString();
    });

    const setDonut = (id, parts, colors = ["#477cf0", "#ffdb4d", "#ff3d45"]) => {
      const total = parts.reduce((sum, value) => sum + value, 0);
      const donut = document.getElementById(id);
      if (!donut) return;
      if (!total) {
        donut.style.background = "#cbd6d8";
        return;
      }

      const segmentEnds = [];
      let current = 0;
      for (let index = 0; index < parts.length; index += 1) {
        current += (parts[index] / total) * 100;
        segmentEnds.push(current);
      }

      const stops = [];
      for (let index = 0; index < parts.length; index += 1) {
        const start = index === 0 ? 0 : segmentEnds[index - 1];
        const end = segmentEnds[index];
        stops.push(`${colors[index]} ${start}% ${end}%`);
      }
      donut.style.background = `conic-gradient(${stops.join(", ")})`;
    };

    const bookDonutColor = prefix === "adm" ? "#4f8a68" : "#265c42";
    setDonut(`${prefix}-books-donut`, [booksInChart, borrowed, overdue], [bookDonutColor, "#ffdb4d", "#ff3d45"]);
    if (prefix === "adm") {
      setDonut(
        `${prefix}-users-donut`,
        [administrators, librarians, faculty, students, visitors],
        ["#a6cdb5", "#78aa8c", "#4f8a68", "#265c42", "#ffdb4d"],
      );
    } else {
      setDonut(`${prefix}-users-donut`, [students, faculty], ["#477cf0", "#ffdb4d"]);
    }
  }

  async function loadAdminDashboardStats() {
    if (!state.authToken || state.currentUser?.role !== "admin") return;
    applyDashboardStats(await getJson("/dashboard/stats"));
  }

  async function loadLibrarianDashboardStats() {
    if (!state.authToken || state.currentUser?.role !== "librarian") return;
    applyDashboardStats(await getJson("/dashboard/stats"), "lib");
  }

  async function refreshLibrarianDashboardStats() {
    if (librarianDashboardRefreshInFlight || state.activeView !== "lib-dashboard" || document.hidden) return;
    librarianDashboardRefreshInFlight = true;
    try {
      await loadLibrarianDashboardStats();
    } catch (err) {
      toast(`Unable to refresh librarian dashboard statistics: ${err.message}`);
    }
    try {
      await loadLibrarianInbox();
    } catch (err) {
      toast(`Unable to refresh notifications: ${err.message}`);
    } finally {
      librarianDashboardRefreshInFlight = false;
    }
  }

  function stopLibrarianDashboardRefresh() {
    if (librarianDashboardRefreshTimer !== null) {
      window.clearInterval(librarianDashboardRefreshTimer);
      librarianDashboardRefreshTimer = null;
    }
  }

  function startLibrarianDashboardRefresh() {
    stopLibrarianDashboardRefresh();
    refreshLibrarianDashboardStats();
    librarianDashboardRefreshTimer = window.setInterval(
      refreshLibrarianDashboardStats,
      ADMIN_DASHBOARD_REFRESH_MS,
    );
  }

  async function refreshAdminDashboardStats() {
    if (adminDashboardRefreshInFlight || state.activeView !== "adm-dashboard" || document.hidden) return;
    adminDashboardRefreshInFlight = true;
    try {
      await loadAdminDashboardStats();
    } catch (err) {
      toast(`Unable to refresh dashboard statistics: ${err.message}`);
    } finally {
      adminDashboardRefreshInFlight = false;
    }
  }

  function stopAdminDashboardRefresh() {
    if (adminDashboardRefreshTimer !== null) {
      window.clearInterval(adminDashboardRefreshTimer);
      adminDashboardRefreshTimer = null;
    }
  }

  function startAdminDashboardRefresh() {
    stopAdminDashboardRefresh();
    refreshAdminDashboardStats();
    adminDashboardRefreshTimer = window.setInterval(
      refreshAdminDashboardStats,
      ADMIN_DASHBOARD_REFRESH_MS,
    );
  }

  async function loadBooks() {
    const rows = await getJson("/books");
    if (!Array.isArray(rows)) throw new Error("Invalid book data received from the server.");
    BOOKS.splice(
      0,
      BOOKS.length,
      ...rows.map((book) => ({
        id: String(book.id),
        title: String(book.title || ""),
        author: String(book.author || ""),
        isbn: String(book.isbn || ""),
        avail: Number(book.avail) || 0,
        total: Number(book.total) || 0,
        categories: categoriesForBook(book.title),
      })),
    );
    if (["member", "visitor"].includes(state.currentUser?.role)) {
      restoreMemberCart();
      const validBookIds = new Set(BOOKS.map((book) => book.id));
      const validCart = Array.from(state.cart).filter((bookId) => validBookIds.has(bookId));
      state.cart = new Set(validCart);
      saveMemberCart();
    }
    if (qs("#catalog-table")) renderCatalog();
    if (qs("#cart-table")) renderCart();
    if (qs("#borrowed-table")) renderBorrowed();
    if (qs("#lib-inv-table")) renderLibInventory();
    if (qs("#adm-catalog-table")) renderAdmCatalog();
  }

  function toE164Phone(value) {
    const raw = String(value || "").trim().replace(/[^\d+]/g, "");
    if (raw.startsWith("+")) return raw;
    if (raw.startsWith("09") && raw.length === 11) {
      return `+63${raw.slice(1)}`;
    }
    if (raw.startsWith("639") && raw.length === 12) {
      return `+${raw}`;
    }
    return raw;
  }

  function isPublicChrome(id) {
    return (
      id === "home" ||
      id === "about" ||
      id === "contact" ||
      id === "login" ||
      id.startsWith("login-") ||
      id === "register" ||
      id === "otp-signup" ||
      id === "otp-forgot" ||
      id === "forgot" ||
      id === "reset-password"
    );
  }

  function navMark(active, target) {
    return active === target ? "nav-active" : "";
  }

  function staffNavLib(active) {
    const catActive = active === "lib-inventory" ? "nav-active" : "";
    return `
    <nav class="staff-secondary-nav" aria-label="Librarian">
      <div class="staff-secondary-nav-inner">
        <button type="button" class="${navMark(active, "lib-dashboard")}" data-go="lib-dashboard">Dashboard</button>
        <button type="button" class="${catActive}" data-go="lib-inventory">Catalog Management</button>
        <button type="button" class="${navMark(active, "lib-borrowing")}" data-go="lib-borrowing">Borrowing &amp; Returning Control</button>
        <button type="button" class="${navMark(active, "lib-policies")}" data-go="lib-policies">Returning Policies</button>
        <button type="button" class="${navMark(active, "lib-overdue")}" data-go="lib-overdue">Overdue Monitoring</button>
        <button type="button" class="${navMark(active, "lib-announcements")}" data-go="lib-announcements">Announcements</button>
        <button type="button" class="${navMark(active, "lib-report")}" data-go="lib-report">System Report</button>
        <button type="button" class="${navMark(active, "lib-calendar")}" data-go="lib-calendar">Edit Calendar</button>
      </div>
    </nav>`;
  }

  function staffNavAdm(active) {
    const staffGrp =
      ["adm-users", "adm-librarians", "adm-activity"].includes(active) ? "nav-active" : "";
    return `
    <nav class="staff-secondary-nav" aria-label="Administrator">
      <div class="staff-secondary-nav-inner">
        <button type="button" class="${navMark(active, "adm-dashboard")}" data-go="adm-dashboard">Dashboard</button>
        <div class="nav-dd-wrap">
          <button type="button" class="${staffGrp}">User &amp; Staff Management ▾</button>
          <div class="nav-dd-panel">
            <button type="button" data-go="adm-users">User account</button>
            <button type="button" data-go="adm-librarians">Librarian Account</button>
            <button type="button" data-go="adm-activity">Librarian Activity Log</button>
          </div>
        </div>
        <button type="button" class="${navMark(active, "adm-catalog")}" data-go="adm-catalog">Catalog Oversight</button>
        <button type="button" class="${navMark(active, "adm-sms")}" data-go="adm-sms">Auto Notification Rules</button>
        <button type="button" class="${navMark(active, "adm-reports")}" data-go="adm-reports">System Reports &amp; Analytics</button>
        <button type="button" class="${navMark(active, "adm-announcements")}" data-go="adm-announcements">Announcement &amp; Communication</button>
        <button type="button" class="${navMark(active, "adm-report-requests")}" data-go="adm-report-requests">Report Request</button>
      </div>
    </nav>`;
  }

  function refreshChrome(viewId) {
    if (!els.chromeRoot) return;
    document.body.classList.remove("mode-member", "mode-staff");

    if (isPublicChrome(viewId)) {
      els.chromeRoot.innerHTML = `
      <header class="ggc-banner">
        <img src="${ASSET_LOGO}" alt="Golden Gate Colleges" class="ggc-seal" width="56" height="56" />
        <h1 class="ggc-banner-title">${GGC_TITLE}</h1>
      </header>
      <div class="ggc-subbar"><nav><a href="#" data-go="about">About</a><a href="#" data-go="contact">Contact</a></nav></div>`;
      return;
    }

    if (viewId.startsWith("member-")) {
      els.chromeRoot.innerHTML = "";
      document.body.classList.add("mode-member");
      return;
    }

    document.body.classList.add("mode-staff");

    if (viewId.startsWith("lib-")) {
      const librarianName = String(
        state.currentUser?.name || state.currentUser?.username || "Librarian",
      ).trim();
      const librarianInitial = librarianName.charAt(0).toUpperCase() || "L";
      els.chromeRoot.innerHTML = `
      <header class="ggc-banner staff-layout">
        <div class="brand-lockup">
          <img src="${ASSET_LOGO}" alt="" class="ggc-seal" width="52" height="52" />
          <span class="brand-lockup-text">${GGC_TITLE}</span>
        </div>
        <div class="staff-user-menu librarian-user-menu">
          <button type="button" class="staff-notification-button" data-go="lib-messages" aria-label="Notifications" title="Notifications">
            <img src="assets/notif.png" alt="" aria-hidden="true" />
          </button>
          <button type="button" class="staff-user-avatar" aria-label="Open librarian menu for ${escapeHtml(librarianName)}" aria-expanded="false" title="${escapeHtml(librarianName)}">
            <span aria-hidden="true">${escapeHtml(librarianInitial)}</span>
          </button>
          <div class="staff-user-dropdown" role="menu">
            <div class="staff-user-dropdown-name">${escapeHtml(librarianName)}</div>
            <button type="button" data-action="lib-edit-profile" role="menuitem">Edit Profile</button>
            <button type="button" data-go="lib-logout-confirm" role="menuitem">Log out</button>
          </div>
        </div>
      </header>
      ${staffNavLib(viewId)}`;
      return;
    }

    if (viewId.startsWith("adm-")) {
      els.chromeRoot.innerHTML = `
      <header class="ggc-banner staff-layout">
        <div class="brand-lockup">
          <img src="${ASSET_LOGO}" alt="" class="ggc-seal" width="52" height="52" />
          <span class="brand-lockup-text">${GGC_TITLE}</span>
        </div>
        <div class="staff-user-menu">
          <button type="button" class="staff-user-avatar" aria-label="Open administrator menu" aria-expanded="false">
            <span aria-hidden="true">A</span>
          </button>
          <div class="staff-user-dropdown" role="menu">
            <button type="button" data-go="adm-logout-confirm" role="menuitem">Log out</button>
          </div>
        </div>
      </header>
      ${staffNavAdm(viewId)}`;
    }
  }

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }
  function qsa(sel, ctx = document) {
    return Array.from(ctx.querySelectorAll(sel));
  }

  function showView(id, options = {}) {
    qsa(".view").forEach((v) => v.classList.add("hidden"));
    const node = document.getElementById("view-" + id);
    if (node) {
      if (id === "member-catalog" && state.activeView !== "member-catalog" && !options.preserveCatalogCategory) {
        state.catalogCategory = "All Books";
        state.catalogCategoriesOpen = false;
      }
      if (id !== "member-catalog") state.catalogCategoriesOpen = false;
      if (!id.startsWith("member-contact")) state.contactSectionsOpen = false;
      node.classList.remove("hidden");
      state.activeView = id;
      window.scrollTo(0, 0);
      refreshChrome(id);
      if (typeof onViewShown === "function") onViewShown(id);
    }
  }

  function onViewShown(id) {
    if (id.startsWith("member-")) {
      hydrateMemberSidebars();
      hydrateMemberProfiles();
      if (state.authToken && ["member", "visitor"].includes(state.currentUser?.role)) {
        loadMemberNotifications()
          .then(() => {
            if (state.activeView === "member-notifications") renderMemberNotifications();
            else updateMemberNotificationIcon();
          })
          .catch((err) => toast(`Unable to load notifications: ${err.message}`));
      }
    }
    if (id === "member-catalog") {
      renderCatalog();
      loadMemberTransactions()
        .then(() => renderCatalog())
        .catch((err) => toast(`Unable to refresh borrow request status: ${err.message}`));
    }
    if (id === "member-categories") renderMemberCategories();
    if (id === "member-cart") renderCart();
    if (id === "member-borrowed") {
      renderBorrowed();
      loadMemberTransactions()
        .then(() => renderBorrowed())
        .catch((err) => toast(`Unable to load borrowed books: ${err.message}`));
    }
    if (id === "member-notifications") {
      renderMemberNotifications();
    }
    if (id === "member-transactions") {
      renderTransactionsTable();
      loadMemberTransactions()
        .then(() => renderTransactionsTable())
        .catch((err) => toast(`Unable to load transaction history: ${err.message}`));
    }
    if (id === "member-profile") renderMemberProfile();
    if (id === "member-calendar") mountCalendar(document.getElementById("member-calendar-mount"), false);
    if (id === "adm-dashboard") {
      startAdminDashboardRefresh();
    } else {
      stopAdminDashboardRefresh();
    }
    if (id === "lib-dashboard") {
      startLibrarianDashboardRefresh();
    } else {
      stopLibrarianDashboardRefresh();
    }
    if (id === "lib-inventory") renderLibInventory();
    if (id === "lib-borrowing") {
      renderLibBorrowTabs();
      loadPendingTransactions().catch((err) => {
        toast(`Unable to load borrowing and return records: ${err.message}`);
      });
    }
    if (id === "lib-policies") {
      loadLibraryPolicy().catch((err) => {
        toast(`Unable to load borrowing policy: ${err.message}`);
      });
    }
    if (id === "lib-overdue") {
      renderLibOverdue();
      loadLibrarianOverdue().catch((err) => {
        toast(`Unable to load overdue books: ${err.message}`);
      });
    }
    if (id === "lib-messages") {
      renderLibInbox();
    }
    if (id.startsWith("lib-") && id !== "lib-dashboard") {
      loadLibrarianInbox().catch((err) => toast(`Unable to load notifications: ${err.message}`));
    }
    if (id === "lib-report") hydrateReportTable(qs("#view-lib-report .data-table tbody"));
    if (id === "lib-calendar") mountCalendar(document.getElementById("lib-calendar-mount"), true);
    if (id === "adm-users") {
      renderAdmUsers();
      loadAdminUsers().catch((err) => toast(`Unable to load user accounts: ${err.message}`));
      loadAdminDashboardStats().catch((err) => toast(`Unable to load user statistics: ${err.message}`));
    }
    if (id === "adm-activity") renderActivityLog();
    if (id === "adm-catalog") renderAdmCatalog();
    if (id === "adm-announcements") renderAdmAnnouncements();
    if (id === "adm-report-requests") renderReportRequests();
  }

  function navigate(target, options) {
    showView(target, options);
  }

  function toast(msg) {
    openModal(`
      <div class="modal-sheet-pdf modal-sheet-green">
        <div class="modal-head-pdf modal-head-green">
          <h3>Library System</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <div class="modal-body-pdf">
          <p class="modal-message-green">${escapeHtml(msg)}</p>
          <div class="modal-foot-pdf">
            <button type="button" class="btn-submit-request" data-close-modal>Close</button>
          </div>
        </div>
      </div>`);
  }

  function openModal(html) {
    els.modalBody.innerHTML = html;
    const memberRole = ["member", "visitor"].includes(String(state.currentUser?.role || "").toLowerCase());
    els.modalRoot.classList.toggle("member-role-modal", memberRole);
    els.modalRoot.classList.remove("hidden");
    els.modalRoot.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    els.modalRoot.classList.add("hidden");
    els.modalRoot.classList.remove("member-role-modal");
    els.modalRoot.setAttribute("aria-hidden", "true");
    els.modalBody.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  async function openContactThreadModal(threadId, allowReply) {
    try {
      const thread = await getJson(`/contact-messages/${encodeURIComponent(threadId)}`);
      if (!Array.isArray(thread.messages)) throw new Error("Invalid message thread received from the server.");
      const messages = thread.messages.map((message) => {
        const sender = message.senderType
          ? `${message.sender} (${message.senderType})`
          : message.sender;
        const replyToSender = message.replyTo
          ? message.replyTo.senderType
            ? `${message.replyTo.sender} (${message.replyTo.senderType})`
            : message.replyTo.sender
          : "";
        const replyContext = replyToSender
          ? `<span class="contact-thread-reply-context">Replying to ${escapeHtml(replyToSender)}</span>`
          : "";
        return `<article class="contact-thread-message"><div class="contact-thread-message-meta"><strong>${escapeHtml(sender)}</strong><span>${escapeHtml(formatNotificationTimestamp({ createdAt: message.createdAt, date: message.createdAt }))}</span></div>${replyContext}<p>${escapeHtml(message.body)}</p></article>`;
      }).join("");
      const content = `
        <div class="modal-sheet-pdf modal-sheet-green contact-thread-modal">
          <div class="modal-head-pdf modal-head-green">
            <h3>${escapeHtml(thread.topic || "Message Conversation")}</h3>
            <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
          </div>
          ${allowReply
            ? `<form class="modal-body-pdf" id="contact-thread-reply-form" data-thread-id="${escapeHtml(String(thread.id))}">
                <div class="contact-thread-messages">${messages || `<p class="muted">No messages in this conversation yet.</p>`}</div>
                <label for="contact-thread-reply">Your reply</label>
                <textarea id="contact-thread-reply" name="reply" rows="4" maxlength="500" required></textarea>
                <div class="modal-foot-pdf">
                  <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
                  <button type="submit" class="btn-submit-request">Send Reply</button>
                </div>
              </form>`
            : `<div class="modal-body-pdf">
                <div class="contact-thread-messages">${messages || `<p class="muted">No messages in this conversation yet.</p>`}</div>
                <div class="modal-foot-pdf">
                  <button type="button" class="btn-cancel-soft" data-close-modal>Close</button>
                  <button type="button" class="btn-submit-request" data-open-thread-reply="${escapeHtml(String(thread.id))}">Reply</button>
                </div>
              </div>`}
        </div>`;
      openModal(content);
    } catch (err) {
      toast(`Unable to load message conversation: ${err.message}`);
    }
  }

  function openAnnouncementComposer(initialAnnouncement = {}) {
    const today = new Date();
    const publicationDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const title = String(initialAnnouncement.title || "");
    const body = String(initialAnnouncement.body || "");
    const audience = String(initialAnnouncement.audience || "everyone");
    const selectedPublicationDate = String(initialAnnouncement.publicationDate || publicationDate);
    openModal(`
      <div class="modal-sheet-pdf modal-sheet-green lib-message-modal">
        <div class="modal-head-pdf modal-head-green">
          <h3>Create Announcement</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <form class="modal-body-pdf" id="lib-announcement-form" data-announcement-id="${escapeHtml(String(initialAnnouncement.id || ""))}">
          <label for="lib-announcement-title">Title</label>
          <input class="lib-announcement-control" id="lib-announcement-title" name="title" maxlength="100" value="${escapeHtml(title)}" required />
          <label for="lib-announcement-body">Announcement Body</label>
          <textarea id="lib-announcement-body" name="body" maxlength="2000" required>${escapeHtml(body)}</textarea>
          <label for="lib-announcement-audience">Audience</label>
          <select class="lib-announcement-control" id="lib-announcement-audience" name="audience" required>
            <option value="everyone" ${audience === "everyone" ? "selected" : ""}>Everyone</option>
            <option value="students" ${audience === "students" ? "selected" : ""}>Students</option>
            <option value="faculty" ${audience === "faculty" ? "selected" : ""}>Faculty / Teachers</option>
            <option value="visitors" ${audience === "visitors" ? "selected" : ""}>Visitors</option>
          </select>
          <label for="lib-announcement-date">Publication Date</label>
          <input class="lib-announcement-control" id="lib-announcement-date" name="publicationDate" type="date" value="${escapeHtml(selectedPublicationDate)}" min="${publicationDate}" required />
          <div class="modal-foot-pdf">
            <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
            <button type="submit" class="btn-submit-request">Publish Announcement</button>
          </div>
        </form>
      </div>
    `);
  }

  function renderMemberMessagePreview() {
    const preview = qs("#member-contact-preview");
    const reasonPreview = qs("#member-contact-reason-preview");
    const composeButton = qs("#compose-member-message");
    const editButton = qs("#edit-member-message");
    const sendButton = qs("#send-member-message");
    if (!preview || !reasonPreview || !composeButton || !editButton || !sendButton) return;
    preview.value = state.composedMemberMessage;
    const hasMessage = Boolean(state.composedMemberMessage);
    reasonPreview.textContent = state.composedMemberReason ? `Contact reason: ${state.composedMemberReason}` : "";
    reasonPreview.hidden = !state.composedMemberReason;
    composeButton.hidden = hasMessage;
    editButton.hidden = !hasMessage;
    sendButton.hidden = !hasMessage;
    sendButton.disabled = !hasMessage;
  }

  function memberNavItems(active) {
    const catalogOpen = active === "member-catalog" || state.catalogCategoriesOpen;
    const categoryOptions = [
      "Fiction",
      "Non-fiction",
      "Literature",
      "History",
      "Science",
      "Technology",
      "Education",
      "Reference",
      "Arts and Culture",
    ];
    const items = [
      ["Books Cart", "member-cart"],
      ["Books To Return", "member-borrowed"],
      ["Transactions History", "member-transactions"],
    ];
    return `
      <button type="button" class="member-nav side-link${catalogOpen ? " active" : ""}" data-catalog-toggle aria-expanded="${catalogOpen}">
        Book Catalog and Search
      </button>
      <div class="member-subnav${catalogOpen ? " is-open" : ""}" data-catalog-subnav>
        <button type="button" class="member-subnav-link${active === "member-catalog" && state.catalogCategory === "All Books" && !state.catalogCategoriesOpen ? " active" : ""}" data-go="member-catalog" data-catalog-category="All Books">All Books</button>
        <button type="button" class="member-subnav-link member-categories-toggle${state.catalogCategoriesOpen ? " active" : ""}" data-catalog-categories-toggle aria-expanded="${state.catalogCategoriesOpen}">
          Categories
        </button>
        <div class="member-category-subnav${state.catalogCategoriesOpen ? " is-open" : ""}" data-catalog-category-list>
          ${categoryOptions
            .map(
              (category) =>
                `<button type="button" class="member-category-subnav-link${state.catalogCategory === category ? " active" : ""}" data-catalog-category="${category}">${category}</button>`,
            )
            .join("")}
        </div>
      </div>
    ${items
      .map(
        ([label, vid]) =>
          `<button type="button" class="member-nav side-link${vid === active ? " active" : ""}" data-go="${vid}">${label}</button>`,
      )
      .join("")}
    <button type="button" class="member-nav side-link${active.startsWith("member-contact") ? " active" : ""}" data-contact-toggle aria-expanded="${state.contactSectionsOpen}">
      Contact
    </button>
    <div class="member-subnav${state.contactSectionsOpen ? " is-open" : ""}" data-contact-subnav>
      <button type="button" class="member-subnav-link${active === "member-contact" ? " active" : ""}" data-go="member-contact">Library Contact Details</button>
      <button type="button" class="member-subnav-link${active === "member-contact-message" ? " active" : ""}" data-go="member-contact-message">Send A Message</button>
      <button type="button" class="member-subnav-link${active === "member-contact-faq" ? " active" : ""}" data-go="member-contact-faq">FAQ</button>
    </div>`;
  }

  function hydrateMemberSidebars() {
    const active = state.activeView.startsWith("member-") ? state.activeView : "member-catalog";
    const html = `
      <div class="member-brand">
        <img src="${ASSET_LOGO}" alt="" class="ggc-side-logo" width="92" height="92" />
        <p class="member-brand-title">Golden Gate Colleges Library System</p>
      </div>
      ${memberNavItems(active)}
      <button type="button" class="member-nav side-link${active === "member-calendar" ? " active" : ""}" data-go="member-calendar">Calendar Of Activities</button>
    `;
    qsa(".member-sidebar").forEach((aside) => {
      aside.innerHTML = html;
    });
  }

  function hydrateMemberProfiles() {
    const displayName = String(
      state.currentUser?.name ||
      state.currentUser?.username ||
      state.currentMemberName ||
      "User",
    ).trim();
    const initial = displayName.charAt(0).toUpperCase() || "U";

    qsa(".member-page-head").forEach((header) => {
      let menu = qs(".member-user-menu", header);
      if (!menu) {
        menu = document.createElement("div");
        menu.className = "member-user-menu";
        menu.innerHTML = `
          <button type="button" class="member-notification-button" data-go="member-notifications" aria-label="Notifications" title="Notifications">
            <img src="assets/notif.png" alt="" aria-hidden="true" />
          </button>
          <button type="button" class="member-user-avatar" aria-label="Open user menu" aria-expanded="false"></button>
          <div class="member-user-dropdown" role="menu">
            <div class="member-user-dropdown-name" data-member-display-name>User</div>
            <button type="button" data-go="member-profile" role="menuitem">Edit Profile</button>
            <button type="button" data-go="member-logout-confirm" role="menuitem">Log out</button>
          </div>`;
        header.appendChild(menu);
      }
      const avatar = qs(".member-user-avatar", menu);
      avatar.textContent = initial;
      avatar.title = displayName;
      avatar.setAttribute("aria-label", `Open user menu for ${displayName}`);
      const nameNode = qs("[data-member-display-name]", menu);
      if (nameNode) nameNode.textContent = displayName;
    });
    updateMemberNotificationIcon();
  }

  function updateMemberNotificationIcon() {
    const unreadCount = state.notifications.filter((notification) => !notification.read).length;
    qsa(".member-notification-button").forEach((button) => {
      const image = qs("img", button);
      if (image) image.src = unreadCount ? "assets/notif1.png" : "assets/notif.png";
      const label = unreadCount
        ? `Notifications, ${unreadCount} unread`
        : "Notifications, no unread notifications";
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  }

  function getBook(bookId) {
    return BOOKS.find((b) => b.id === bookId);
  }

  function currentDateMMDDYYYY() {
    const date = new Date();
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  }

  function memberIdentity() {
    return {
      user: String(state.currentUser?.name || state.currentMemberName || "Member Demo").trim(),
      sid: String(state.currentUser?.schoolId || state.currentUser?.sid || "CET 123").trim(),
    };
  }

  function memberCartStorageKeys() {
    const user = state.currentUser;
    const identifiers = [
      user?.schoolId,
      user?.sid,
      user?.username,
      user?.email,
      user?.name,
      user?.id,
      state.currentMemberName,
    ]
      .map((identifier) => String(identifier || "").trim().toLowerCase())
      .filter(Boolean);
    if (!user) identifiers.push("member-demo");
    return [...new Set(identifiers)].map((identifier) => `ggc-library-cart:${identifier}`);
  }

  function memberCartStorageKey() {
    return memberCartStorageKeys()[0];
  }

  function saveMemberCart() {
    localStorage.setItem(memberCartStorageKey(), JSON.stringify(Array.from(state.cart)));
  }

  function restoreMemberCart() {
    state.cart.clear();
    const storageKeys = memberCartStorageKeys();
    for (const storageKey of storageKeys) {
      const stored = localStorage.getItem(storageKey);
      if (!stored) continue;
      const savedIds = JSON.parse(stored);
      if (!Array.isArray(savedIds)) throw new Error("Saved cart data is invalid.");
      savedIds
        .map((bookId) => String(bookId))
        .forEach((bookId) => state.cart.add(bookId));
    }
    if (state.cart.size > 0) saveMemberCart();
  }

  function hasPendingRequest(bookId) {
    const identity = memberIdentity();
    return state.pendingApprove.some(
      (r) => r.bookId === bookId && r.user === identity.user && r.memberRequest === true,
    );
  }

  function hasBorrowedBook(bookId) {
    return state.borrowed.some((r) => r.bookId === bookId);
  }

  function requestButton(b, source = "catalog") {
    const cartAttribute = source === "cart" ? ' data-from-cart="true"' : "";
    if (b.avail <= 0) {
      return `<button type="button" class="btn-borrow-pdf btn-borrow-unavailable" disabled title="This book is currently unavailable.">Unavailable</button>`;
    }
    if (b.avail === 1) {
      return `<button type="button" class="btn-borrow-pdf btn-borrow-unavailable" disabled title="The last available copy must remain in the library.">Last Copy Reserved</button>`;
    }
    if (hasPendingRequest(b.id)) {
      return `<button type="button" class="btn-borrow-pdf" disabled>Request Pending</button>`;
    }
    if (hasBorrowedBook(b.id)) {
      if (source === "catalog") {
        return `<span class="borrowed-status">Already Borrowed</span>`;
      }
      return `<button type="button" class="btn-borrow-pdf" disabled>Already Borrowed</button>`;
    }
    return `<button type="button" class="btn-borrow-pdf borrow-now"${cartAttribute} data-book="${b.id}">Request To Borrow</button>`;
  }

  function bookRowActions(b, mode) {
    if (mode === "catalog") {
      const inCart = state.cart.has(b.id);
      const cartIcon = inCart ? "assets/ud-icons/addedtocart.png" : "assets/ud-icons/addtocart.png";
      const requestPending = hasPendingRequest(b.id);
      const cartLabel = requestPending
        ? "A borrow request has already been sent for this book"
        : inCart
          ? "Book is already in cart"
          : "Add book to cart";
      return `
        <div class="cell-actions">
          ${requestButton(b)}
          <button type="button" class="btn-add-cart-pdf add-cart${requestPending ? " add-cart-pending" : ""}" data-book="${b.id}" title="${cartLabel}" aria-label="${cartLabel}">
            <img src="${cartIcon}" alt="" aria-hidden="true" />
          </button>
        </div>`;
    }
    if (mode === "cart") {
      return `
        ${requestButton(b, "cart")}
        <button type="button" class="btn-remove-soft remove-cart" data-book="${b.id}" title="Remove from cart" aria-label="Remove ${escapeHtml(b.title)} from cart">
          <img src="assets/ud-icons/remove.png" alt="" aria-hidden="true" />
        </button>`;
    }
    return "";
  }

  function filteredBooks(q, category = state.catalogCategory) {
    const s = q.trim().toLowerCase();
    return BOOKS.filter((b) => {
      const matchesCategory = category === "All Books" || (b.categories || []).includes(category);
      const matchesSearch = !s || b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s);
      return matchesCategory && matchesSearch;
    });
  }

  function renderCatalog() {
    const tbody = qs("#catalog-table tbody");
    if (!tbody) return;
    const qInput = qs("#catalog-search");
    const q = qInput?.value ?? "";
    const books = filteredBooks(q);
    tbody.innerHTML = books.length ? books
      .map(
        (b) =>
          `<tr><td class="book-title-cell">${escapeHtml(b.title.toUpperCase())}</td><td>${escapeHtml(b.author)}</td><td>${escapeHtml(b.isbn)}</td><td>${b.avail}/${
            b.total
          }</td><td>${bookRowActions(b, "catalog")}</td></tr>`,
      )
      .join("") : `<tr><td colspan="5" class="muted">No books found in this category.</td></tr>`;
  }

  function renderCart() {
    const tbody = qs("#cart-table tbody");
    const rows = BOOKS.filter((b) => state.cart.has(b.id));
    tbody.innerHTML = rows
      .map(
        (b) =>
          `<tr><td class="book-title-cell">${escapeHtml(b.title.toUpperCase())}</td><td>${escapeHtml(b.author)}</td><td>${escapeHtml(b.isbn)}</td><td>${b.avail}/${
            b.total
          }</td><td><div class="cell-actions">${bookRowActions(b, "cart")}</div></td></tr>`,
      )
      .join("");
    if (!rows.length)
      tbody.innerHTML = `<tr><td colspan="5" class="muted">Cart is empty — add titles from Book Catalog.</td></tr>`;
    const borrowAll = qs("#borrow-all");
    if (borrowAll) borrowAll.disabled = rows.filter((b) => b.avail > 1).length === 0;
  }

  function renderBorrowed() {
    const tbody = qs("#borrowed-table tbody");
    const identity = memberIdentity();
    tbody.innerHTML = state.borrowed
      .map((br) => {
        const b = getBook(br.bookId);
        if (!b) return "";
        if (br.user && br.user !== identity.user) return "";
        return `<tr><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td><td>${br.borrowed}</td><td>${br.due}</td><td><span class="return-process-guidance">Walk-in return at the library counter</span></td></tr>`;
      })
      .join("");
    if (!tbody.innerHTML.trim()) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">No currently borrowed books.</td></tr>`;
    }
  }

  function renderMemberNotifications() {
    const ul = qs("#member-notifications");
    const tabs = qsa(".member-notification-tab");
    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-notification-filter") === state.notificationFilter;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    if (state.notificationFilter === "sent") {
      const sentMessages = [...state.sentMessages].sort(compareNotificationRecency);
      ul.innerHTML = sentMessages.length
        ? sentMessages
          .map((message) => {
            const idx = state.sentMessages.indexOf(message);
            return `<li class="member-sent-message"><div class="member-sent-message-content"><div class="member-notification-summary-meta"><span>${escapeHtml(formatNotificationTimestamp({ createdAt: message.date, date: message.date }))}</span><span>From: You</span></div><strong>Message Conversation</strong></div><div class="member-notification-actions"><button type="button" class="btn btn-outline sm read-sent-message" data-si="${idx}">View</button><button type="button" class="btn btn-outline sm reply-sent-message" data-si="${idx}">Reply</button></div></li>`;
          })
            .join("")
        : `<li class="member-notification-empty">You have not sent any messages yet.</li>`;
      updateMemberNotificationIcon();
      return;
    }

    const visibleNotifications = state.notifications.filter((notification) => {
      if (state.notificationFilter === "all") return true;
      if (state.notificationFilter === "announcements") return notification.announcementId != null;
      if (state.notificationFilter === "transactions") {
        return /^(borrow request|book borrowing|return request)/i.test(notification.title);
      }
      if (state.notificationFilter === "messages") {
        return notification.announcementId == null && !/^(borrow request|book borrowing|return request)/i.test(notification.title);
      }
      return true;
    }).sort(compareNotificationRecency);
    ul.innerHTML = visibleNotifications.length
      ? visibleNotifications
      .map(
        (notification) => {
          const idx = state.notifications.indexOf(notification);
          const sender = notification.senderType
            ? `${notification.sender || "System Notification"} (${notification.senderType})`
            : notification.sender || "System Notification";
          const content = `<div class="member-notification-content"><div class="member-notification-summary-meta"><span>${escapeHtml(formatNotificationTimestamp(notification))}</span><span>From: ${escapeHtml(sender)}</span></div><strong>${escapeHtml(notification.title)}</strong></div>`;
          const unreadClass = notification.read ? "" : " is-unread";
          const replyButton = notification.threadId
            ? `<button type="button" class="btn btn-outline sm reply-msg" data-ni="${idx}">Reply</button>`
            : "";
          return `<li class="member-notification-item${unreadClass}">${content}<div class="table-actions member-notification-actions"><button type="button" class="btn btn-outline sm read-msg" data-ni="${idx}">View</button>${replyButton}<button type="button" class="btn btn-ghost sm remove-note" data-ni="${idx}">Remove</button></div></li>`;
        },
      )
      .join("")
      : `<li class="member-notification-empty">No notifications in this category.</li>`;
    updateMemberNotificationIcon();
  }

  function compareNotificationRecency(a, b) {
    const timeDifference = getNotificationTime(b) - getNotificationTime(a);
    if (timeDifference) return timeDifference;
    return getNotificationId(b) - getNotificationId(a);
  }

  function getNotificationTime(notification) {
    const timestamp = String(notification.createdAt || "");
    const timestampMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i.exec(timestamp);
    if (timestampMatch) {
      const parsedTimestamp = timestampMatch[7]
        ? Date.parse(timestamp.replace(" ", "T"))
        : new Date(
          Number(timestampMatch[1]),
          Number(timestampMatch[2]) - 1,
          Number(timestampMatch[3]),
          Number(timestampMatch[4]),
          Number(timestampMatch[5]),
          Number(timestampMatch[6] || 0),
        ).getTime();
      if (!Number.isNaN(parsedTimestamp)) return parsedTimestamp;
    }

    const dateValue = String(notification.date || "");
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    const localDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateValue);
    if (isoDate) {
      return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])).getTime();
    }
    if (localDate) {
      return new Date(Number(localDate[3]), Number(localDate[1]) - 1, Number(localDate[2])).getTime();
    }
    return 0;
  }

  function getNotificationId(notification) {
    const match = String(notification.id || "").match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  function formatNotificationTimestamp(notification) {
    const { date, time } = getNotificationTimestampParts(notification);
    return time ? `${date} · ${time}` : date;
  }

  function getNotificationTimestampParts(notification) {
    const timestamp = String(notification.createdAt || "");
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i.exec(timestamp);
    if (match) {
      const date = match[7]
        ? new Date(timestamp)
        : new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          Number(match[6] || 0),
        );
      if (!Number.isNaN(date.getTime())) {
        const hour = date.getHours();
        const minute = String(date.getMinutes()).padStart(2, "0");
        const displayHour = hour % 12 || 12;
        const meridiem = hour >= 12 ? "PM" : "AM";
        return {
          date: formatNotificationDate(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
          ),
          time: `${displayHour}:${minute} ${meridiem}`,
        };
      }
    }

    return { date: formatNotificationDate(notification.date), time: "" };
  }

  function formatNotificationDate(value) {
    const dateValue = String(value || "");
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    const localDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateValue);
    if (isoDate) return `${isoDate[2]}/${isoDate[3]}/${isoDate[1]}`;
    if (localDate) return `${localDate[1].padStart(2, "0")}/${localDate[2].padStart(2, "0")}/${localDate[3]}`;
    return "Date unavailable";
  }

  function rebuildTransactions() {
    if (state.authToken && ["member", "visitor"].includes(state.currentUser?.role)) {
      state.txn = state.memberTransactions.map((transaction) => ({
        title: transaction.title,
        author: transaction.author,
        date: transaction.returnDate || transaction.borrowDate,
        status: transaction.status === "pending"
          ? "Request Pending"
          : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1),
      }));
      return;
    }
    const rows = [];
    const identity = memberIdentity();
    state.borrowed.forEach((br) => {
      const b = getBook(br.bookId);
      if (!b) return;
      if (br.user && br.user !== identity.user) return;
      rows.push({
        title: b.title,
        author: b.author,
        date: br.borrowed,
        status: "Borrowed",
      });
    });
    state.pendingApprove.forEach((request) => {
      if (request.user !== identity.user) return;
      rows.push({
        title: request.book,
        author: request.author,
        date: "04/16/2026",
        status: "Request Pending",
      });
    });
    state.txn = rows;
  }

  function addNotification(notification) {
    if (state.authToken && ["member", "visitor"].includes(state.currentUser?.role)) return;
    const now = new Date();
    const createdAt = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-") + ` ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    state.notifications.unshift({
      ...notification,
      createdAt: notification.createdAt || createdAt,
      sender: notification.sender || "Library System",
    });
    updateMemberNotificationIcon();
  }

  function renderTransactionsTable() {
    rebuildTransactions();
    const tbody = qs("#txn-table tbody");
    tbody.innerHTML = state.txn
      .map(
        (t) =>
          `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.author)}</td><td>${escapeHtml(t.date)}</td><td>${escapeHtml(
            t.status,
          )}</td></tr>`,
      )
      .join("");
  }

  function mountCalendar(container, editMode) {
    if (!container) return;
    const daysLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const april2026Closed = new Set(["4", "5", "11", "12"]);
    const holiday = new Set(["9"]);
    const rowsPdf = [
      [1, 2, 3, 4, "", "", ""],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, "", ""],
    ];
    const tbody = rowsPdf
      .map((row) => {
        const tds = row
          .map((d) =>
            d === ""
              ? "<td></td>"
              : `<td>${String(d)}${legendCell(Number(d), april2026Closed, holiday)}</td>`,
          )
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
    container.innerHTML = `
      <p class="cal-title">April <span style="font-size:1rem;color:var(--muted);font-family:var(--font)">2026 · Calendar of Activities</span></p>
      <div class="cal-legend" style="margin-bottom:10px;">
        <span><i class="swatch" style="background:#cfd6e6"></i>Closed</span>
        <span><i class="swatch" style="background:#fde2e2"></i>Holiday</span>
      </div>
      <table><thead><tr>${daysLabels.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>${tbody}</tbody></table>
      ${editMode ? `<p style="margin-top:1rem;"><button type="button" class="btn btn-primary sm" id="lib-cal-edit">Edit Calendar…</button></p>` : ""}
    `;
    const btn = qs("#lib-cal-edit", container);
    if (btn && editMode) btn.addEventListener("click", () => toast("(Demo) Open add activity modal — Month / Day / Year / Type"));
  }

  function legendCell(d, closed, holiday) {
    if (!Number.isFinite(d)) return "";
    const k = String(d);
    let cls = "";
    if (holiday.has(k)) cls = "background:#fde2e2";
    else if (closed.has(k)) cls = "background:#e8eaf2";
    if (!cls) return "";
    return `<div style="font-size:0.65rem;margin-top:2px;padding:2px;border-radius:4px;${cls}">${holiday.has(k) ? "Holiday" : "Closed"}</div>`;
  }

  function modalBorrow(bookId, fromCart = false) {
    const b = getBook(bookId);
    if (!b) return;
    if (b.avail <= 0) {
      toast("This book is currently unavailable.");
      return;
    }
    if (b.avail === 1) {
      toast("The last available copy must remain in the library and cannot be borrowed.");
      return;
    }
    if (hasPendingRequest(bookId)) {
      toast("You have already sent a borrow request for this book.");
      return;
    }
    if (hasBorrowedBook(bookId)) {
      toast("This book is already in your borrowed books.");
      return;
    }
    const requestDate = currentDateMMDDYYYY();
    openModal(`
      <div class="modal-sheet-pdf">
        <div class="modal-head-pdf modal-head-green">
          <h3>Request To Borrow</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <div class="modal-body-pdf">
          <div class="book-lines"><strong>Book title:</strong> ${escapeHtml(b.title)}<br /><strong>Author:</strong> ${escapeHtml(
      b.author,
    )}</div>
          <div class="date-box-pdf">
            <div class="row-date"><span>Request Date</span><span>${requestDate}</span></div>
          </div>
          <p style="font-size:0.82rem;margin:0">Submit this request for librarian approval. The book will only be borrowed after approval.</p>
          <div class="modal-foot-pdf">
            <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
            <button type="button" class="btn-submit-request" id="confirm-borrow-final" data-book="${bookId}">Submit Request</button>
          </div>
        </div>
      </div>`);
    qs("#confirm-borrow-final", els.modalBody)?.addEventListener("click", async () => {
      closeModal();
      const identity = memberIdentity();
      let transactionId;
      if (state.authToken) {
        try {
          const result = await postJson("/transactions/borrow", { bookId: Number(bookId) });
          transactionId = result.transactionId;
        } catch (err) {
          toast(`Unable to submit borrow request: ${err.message}`);
          return;
        }

      }
      state.pendingApprove.unshift({
        transactionId,
        memberRequest: true,
        user: identity.user,
        sid: identity.sid,
        bookId,
        book: b.title,
        author: b.author,
      });
      if (fromCart || state.cart.has(bookId)) {
        state.cart.delete(bookId);
        saveMemberCart();
      }
      addNotification({
        date: requestDate,
        title: "Borrow Request Submitted",
        body: `Your request to borrow ${b.title} is waiting for librarian approval.`,
        read: true,
      });
      toast("Borrow request submitted for librarian approval.");
      openModal(`
      <div class="modal-sheet-pdf">
        <div class="modal-head-pdf modal-head-green"><h3>Request Submitted</h3><button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button></div>
        <div class="modal-body-pdf">
          <p><strong>Your borrow request has been submitted.</strong></p>
          <p class="muted">${escapeHtml(b.title)} will be added to your borrowed books after the librarian approves it.</p>
          <div class="modal-foot-pdf"><button type="button" class="btn-submit-request" id="borrow-success-close">Continue Browsing</button></div>
        </div>
      </div>`);
      qs("#borrow-success-close", els.modalBody)?.addEventListener("click", () => {
        closeModal();
        navigate("member-catalog");
      });
      if (qs("#catalog-table")) renderCatalog();
      if (qs("#cart-table")) renderCart();
      if (qs("#txn-table")) renderTransactionsTable();
    });
  }

  function modalBorrowAll() {
    const rows = BOOKS.filter((b) => state.cart.has(b.id) && b.avail > 1);
    if (!rows.length) {
      toast("There are no borrowable books in your cart. The last available copy must remain in the library.");
      return;
    }
    const requestDate = currentDateMMDDYYYY();
    openModal(`
      <div class="modal-sheet-pdf">
        <div class="modal-head-pdf modal-head-green">
          <h3>Borrow All Books</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <div class="modal-body-pdf">
          <p>Submit one request for the following books:</p>
          <ul class="modal-book-list">${rows
            .map((b) => `<li><strong>${escapeHtml(b.title)}</strong><br /><span class="muted">${escapeHtml(b.author)}</span></li>`)
            .join("")}</ul>
          <div class="date-box-pdf">
            <div class="row-date"><span>Request Date</span><span>${requestDate}</span></div>
          </div>
          <p style="font-size:0.82rem;margin:0">The books will be added to Returning Books only after the librarian approves the request.</p>
          <div class="modal-foot-pdf">
            <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
            <button type="button" class="btn-submit-request" id="confirm-borrow-all">Submit Request</button>
          </div>
        </div>
      </div>`);
    qs("#confirm-borrow-all", els.modalBody)?.addEventListener("click", async () => {
      const identity = memberIdentity();
      const requests = [];
      try {
        for (const b of rows) {
          let transactionId;
          if (state.authToken) {
            const result = await postJson("/transactions/borrow", { bookId: Number(b.id) });
            transactionId = result.transactionId;
          }
          requests.push({ transactionId, memberRequest: true, batchRequest: true, user: identity.user, sid: identity.sid, bookId: b.id, book: b.title, author: b.author });
        }
      } catch (err) {
        toast(`Unable to submit borrow request: ${err.message}`);
        return;
      }
      closeModal();
      state.pendingApprove.unshift(...requests);
      state.cart.clear();
      saveMemberCart();
      addNotification({
        date: requestDate,
        title: "Borrow Request Submitted",
        body: `Your request for ${rows.length} book${rows.length === 1 ? "" : "s"} is waiting for librarian approval.`,
        read: true,
      });
      toast("Borrow request submitted for librarian approval.");
      renderCart();
      renderTransactionsTable();
    });
  }

  function renderLibInventory() {
    const query = qs("#lib-inv-search")?.value || "";
    const rows = filteredBooks(query, "All Books").map(
      (b) =>
        `<tr><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td><td>${escapeHtml(b.isbn)}</td><td class="avail-num">${b.avail}/${
          b.total
        }</td><td><button type="button" class="btn-deactivate btn-edit-book" style="font-size:0.72rem;padding:0.35rem 0.75rem" data-book="${
          b.id
        }">Edit Book</button></td></tr>`,
    ).join("");
    qsa("#lib-inv-table tbody").forEach((tbody) => {
      tbody.innerHTML = rows;
    });
  }

  function openBookEditModal(book, values = book) {
    const totalValue = Number(values.total ?? book.total);
    const totalStock = Number.isInteger(totalValue) && totalValue > 0
      ? String(totalValue)
      : "";
    openModal(`
      <div class="modal-sheet-pdf modal-sheet-green lib-book-edit-modal">
        <div class="modal-head-pdf modal-head-green">
          <h3>Edit Book</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <form id="lib-edit-book-form" data-book-id="${escapeHtml(book.id)}">
          <div class="modal-body-pdf">
            <label for="lib-edit-book-title">Name</label>
            <input id="lib-edit-book-title" name="title" type="text" maxlength="255" value="${escapeHtml(values.title)}" required />
            <label for="lib-edit-book-author">Author</label>
            <input id="lib-edit-book-author" name="author" type="text" maxlength="255" value="${escapeHtml(values.author)}" required />
            <label for="lib-edit-book-isbn">ISBN</label>
            <input id="lib-edit-book-isbn" name="isbn" type="text" maxlength="255" value="${escapeHtml(values.isbn)}" required />
            <label for="lib-edit-book-total">Total Stock</label>
            <input id="lib-edit-book-total" name="total" type="number" min="1" step="1" value="${totalStock}" required />
            <label for="lib-edit-book-available">Available Copies</label>
            <input id="lib-edit-book-available" name="available" type="number" min="0" ${totalStock ? `max="${totalStock}"` : ""} step="1" value="${escapeHtml(values.available ?? values.avail ?? 0)}" required />
            <div class="modal-foot-pdf lib-book-edit-actions">
              <button type="button" class="btn-delete-book" id="lib-edit-book-delete">Delete Book</button>
              <div>
                <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
                <button type="submit" class="btn-submit-request">Save Changes</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    `);

    const form = qs("#lib-edit-book-form", els.modalBody);
    const totalInput = qs("#lib-edit-book-total", form);
    const availableInput = qs("#lib-edit-book-available", form);
    totalInput?.addEventListener("input", () => {
      if (availableInput) {
        if (totalInput.value) availableInput.max = totalInput.value;
        else availableInput.removeAttribute("max");
      }
    });
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const saveButton = qs('button[type="submit"]', form);
      if (saveButton) saveButton.disabled = true;
      try {
        await putJson(`/books/${encodeURIComponent(book.id)}`, {
          title: form.elements.title.value.trim(),
          author: form.elements.author.value.trim(),
          isbn: form.elements.isbn.value.trim(),
          total: Number(form.elements.total.value),
          available: Number(form.elements.available.value),
        });
        await loadBooks();
        renderLibInventory();
        renderCatalog();
        closeModal();
        toast("Book details updated.");
      } catch (err) {
        if (saveButton) saveButton.disabled = false;
        toast(`Unable to update book: ${err.message}`);
      }
    });

    qs("#lib-edit-book-delete", els.modalBody)?.addEventListener("click", () => {
      const draft = {
        title: form.elements.title.value,
        author: form.elements.author.value,
        isbn: form.elements.isbn.value,
        total: form.elements.total.value,
        available: form.elements.available.value,
      };
      openModal(`
        <div class="modal-sheet-pdf modal-sheet-green lib-book-delete-confirm-modal">
          <div class="modal-head-pdf modal-head-green">
            <h3>Confirm Book Deletion</h3>
          </div>
          <div class="modal-body-pdf">
            <p>Remove <strong>${escapeHtml(draft.title)}</strong> from the active catalog? It will no longer appear as available to borrow, but its past transactions will be retained.</p>
            <div class="modal-foot-pdf">
              <button type="button" class="btn-cancel-soft" id="lib-delete-book-cancel">Cancel</button>
              <button type="button" class="btn-delete-book" id="lib-delete-book-confirm">Delete Book</button>
            </div>
          </div>
        </div>
      `);

      qs("#lib-delete-book-cancel", els.modalBody)?.addEventListener("click", () => {
        openBookEditModal(book, draft);
      });
      qs("#lib-delete-book-confirm", els.modalBody)?.addEventListener("click", async (event) => {
        const confirmButton = event.currentTarget;
        confirmButton.disabled = true;
        try {
          await deleteJson(`/books/${encodeURIComponent(book.id)}`);
          await loadBooks();
          renderLibInventory();
          renderCatalog();
          closeModal();
          toast("Book removed from the catalog. Past transactions were retained.");
        } catch (err) {
          confirmButton.disabled = false;
          toast(`Unable to delete book: ${err.message}`);
        }
      });
    });
  }

  function filterLibBorrowTable(input) {
    const tbody = qs(input.getAttribute("data-target"));
    if (!tbody) return;

    const query = input.value.trim().toLocaleLowerCase();
    tbody.querySelector("[data-lib-search-empty]")?.remove();
    let visibleCount = 0;
    tbody.querySelectorAll("tr").forEach((row) => {
      const searchText = row.getAttribute("data-search");
      const visible = !query ? true : searchText !== null && searchText.toLocaleLowerCase().includes(query);
      row.hidden = !visible;
      if (visible && searchText !== null) visibleCount += 1;
    });

    if (query && visibleCount === 0) {
      const row = document.createElement("tr");
      row.setAttribute("data-lib-search-empty", "");
      const cell = document.createElement("td");
      cell.colSpan = Number(input.getAttribute("data-colspan")) || 1;
      cell.className = "muted";
      cell.textContent = "No matching records found.";
      row.append(cell);
      tbody.append(row);
    }
  }

  function renderLibBorrowTabs(which) {
    const borrowPanel = qs("#lib-btab-borrow");
    const retPanel = qs("#lib-btab-return");
    const histPanel = qs("#lib-btab-history");
    const tbodyA = qs("#lib-approve-table tbody");
    const tbodyR = qs("#lib-return-table tbody");

    const activeTab =
      which ||
      qs('#view-lib-borrowing [data-btab].active')?.getAttribute('data-btab') ||
      'borrow';

    if (tbodyA) {
      tbodyA.innerHTML = state.pendingApprove.length
        ? state.pendingApprove
            .map(
              (r, i) =>
                `<tr data-search="${escapeHtml(`${r.sid || ""} ${r.book || ""}`)}"><td>${escapeHtml(r.sid)}</td><td>${escapeHtml(r.user)}</td><td>${escapeHtml(r.course)}</td><td>${escapeHtml(
                  r.userType,
                )}</td><td>${escapeHtml(r.book)}</td><td>${escapeHtml(
                  r.author,
                )}</td><td><div class="table-actions"><button type="button" class="btn btn-primary sm apr" data-i="${i}">Approve</button><button type="button" class="btn btn-outline sm dec" data-i="${i}">Decline</button></div></td></tr>`,
            )
            .join("")
        : `<tr><td colspan="7" class="muted">No pending borrowing requests.</td></tr>`;
    }

    const pendingReturns = state.pendingReturns.map((r, i) => ({
      ...r,
      index: i,
    }));
    if (tbodyR) {
      tbodyR.innerHTML = pendingReturns.length
        ? pendingReturns
            .map(
              (r) =>
                `<tr data-search="${escapeHtml(`${r.sid || ""} ${r.book || ""}`)}"><td>${escapeHtml(r.book)}</td><td>${escapeHtml(r.isbn)}</td><td>${escapeHtml(r.author)}</td><td>${escapeHtml(r.user)}</td><td>${escapeHtml(r.course)}</td><td>${escapeHtml(r.userType)}</td><td><button type="button" class="btn btn-primary sm mark-returned" data-i="${r.index}">Mark As Returned</button></td></tr>`,
            )
            .join("")
        : `<tr><td colspan="7" class="muted">No books are currently checked out.</td></tr>`;
    }

    const histRows = qs("#lib-history-rows");
    if (histRows) {
      histRows.innerHTML = state.historyUsers.length
        ? state.historyUsers
            .map((u) => {
              const role = String(u.role || "").toLowerCase();
              const userType = String(u.userType || "").toLowerCase();
              const course =
                role === "visitor" || userType === "visitor"
                  ? "N/A (Visitor)"
                  : ["faculty", "teacher"].includes(userType)
                    ? "N/A (Faculty)"
                    : u.course || "N/A";
              const accountType = u.userType || u.role || "N/A";
              return `<tr data-search="${escapeHtml(`${u.sid || ""} ${u.name || ""}`)}"><td>${escapeHtml(u.sid || "N/A")}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(course)}</td><td>${escapeHtml(accountType)}</td><td><div class="table-actions lib-history-actions"><button type="button" class="btn btn-outline sm hist-view" data-user-id="${escapeHtml(u.id)}" data-user-name="${escapeHtml(u.name)}">View History</button><button type="button" class="btn btn-primary sm hist-msg" data-user-id="${escapeHtml(u.id)}" data-user-name="${escapeHtml(u.name)}">Message</button></div></td></tr>`;
            })
            .join("")
        : `<tr><td colspan="5" class="muted">No active user or visitor accounts.</td></tr>`;
    }

    qsa("[data-lib-borrow-search]").forEach(filterLibBorrowTable);
    if (borrowPanel) borrowPanel.classList.toggle("hidden", activeTab !== "borrow");
    if (retPanel) retPanel.classList.toggle("hidden", activeTab !== "return");
    if (histPanel) histPanel.classList.toggle("hidden", activeTab !== "history");
  }

  function renderLibOverdue() {
    const tbody = qs("#lib-overdue-table tbody");
    if (!tbody) return;
    tbody.innerHTML = state.overdueRows.length
      ? state.overdueRows
          .map(
            (r, i) =>
              `<tr><td>${escapeHtml(r.sid)}</td><td>${escapeHtml(r.user)}</td><td>${escapeHtml(r.book)}</td><td>${escapeHtml(
                r.borrowed,
              )}</td><td>${escapeHtml(r.due)}</td><td><button type="button" class="btn btn-primary sm sms" data-i="${i}">Notify through SMS</button></td></tr>`,
          )
          .join("")
      : `<tr><td colspan="6" class="muted">No overdue books found.</td></tr>`;
  }

  function renderLibInbox() {
    const ul = qs("#lib-inbox");
    if (!ul) return;
    qsa(".lib-notification-tab").forEach((tab) => {
      const active = tab.getAttribute("data-librarian-notification-filter") === state.libNotificationFilter;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    const notifications = state.libInbox.filter((notification) => (
      ["Sent", "Received", "System"].includes(notification.kind) &&
      (state.libNotificationFilter === "all" || notification.kind === state.libNotificationFilter)
    ));
    ul.innerHTML = notifications.length
      ? notifications
          .map(
            (notification) => {
              const idx = state.libInbox.indexOf(notification);
              const { date, time } = getNotificationTimestampParts(notification);
              const sender = notification.kind === "System"
                ? "Library System"
                : notification.senderType
                  ? `${notification.from || "Library User"} (${notification.senderType})`
                  : notification.from || "Library User";
              const timestamp = time ? `${date} · ${time}` : date;
              const replyButton = ["Received", "Sent"].includes(notification.kind) && notification.threadId
                ? `<button type="button" class="btn btn-outline sm btn-reply-msg" data-idx="${idx}">Reply</button>`
                : "";
              return `<li class="${state.libReadNotificationIds.has(notification.id) ? "is-read" : "is-unread"}"><div class="lib-notice-content"><div class="lib-notification-summary-meta"><span>${escapeHtml(timestamp)}</span><span>From: ${escapeHtml(sender)}</span></div><strong class="lib-notification-topic">${escapeHtml(notification.title || "Notification")}</strong></div><div class="table-actions lib-notice-actions"><button type="button" class="btn btn-outline sm btn-read-msg" data-idx="${idx}">View</button>${replyButton}</div></li>`;
            },
          )
          .join("")
      : `<li class="lib-empty-inbox">No ${state.libNotificationFilter === "all" ? "notifications" : state.libNotificationFilter.toLowerCase() + " notifications"} yet.</li>`;
    updateLibrarianNotificationBell();
  }

  function renderLibAnnouncements() {
    const ul = qs("#lib-announcements-list");
    if (!ul) return;
    const announcements = state.libInbox.filter((notification) => notification.kind === "Announcement");
    ul.innerHTML = announcements.length
      ? announcements
          .map((announcement) => {
            const idx = state.libInbox.indexOf(announcement);
            const timestamp = formatNotificationTimestamp({
              createdAt: announcement.createdAt,
              date: announcement.date,
            });
            return `<li class="${state.libReadNotificationIds.has(announcement.id) ? "is-read" : "is-unread"}"><div class="lib-notice-content"><div class="lib-notification-summary-meta"><span>${escapeHtml(timestamp)}</span><span>Audience: ${escapeHtml(announcement.audience || "Everyone")}</span></div><strong class="lib-notification-topic">${escapeHtml(announcement.title || "Announcement")}</strong></div><div class="table-actions lib-notice-actions"><button type="button" class="btn btn-outline sm btn-read-msg" data-idx="${idx}">View</button><button type="button" class="btn btn-outline sm btn-edit-announcement" data-idx="${idx}">Edit</button></div></li>`;
          })
          .join("")
      : `<li class="lib-empty-inbox">No announcements yet.</li>`;
    updateLibrarianNotificationBell();
  }

  function renderLibrarianNotifications() {
    const ul = qs("#lib-dashboard-notifications");
    if (!ul) return;
    const unread = state.libInbox.filter(
      (notification) => ["Received", "System"].includes(notification.kind) &&
        !state.libReadNotificationIds.has(notification.id),
    );
    ul.innerHTML = unread.length
      ? unread
          .slice(0, 5)
          .map(
            (notification) =>
              `<li><span class="lib-dashboard-notification-icon" aria-hidden="true">✉</span><div class="lib-dashboard-notification-details"><span class="notice-meta">${escapeHtml(
                formatNotificationTimestamp({ createdAt: notification.createdAt, date: notification.date }),
              )}</span><strong>${escapeHtml(notification.title || notification.kind)}</strong><span class="muted small">${escapeHtml(
                notification.from,
              )}</span></div></li>`,
          )
          .join("")
      : `<li class="lib-empty-notification">No new notifications yet.</li>`;
    updateLibrarianNotificationBell();
  }

  function updateLibrarianNotificationBell() {
    const unreadCount = state.libInbox.filter(
      (notification) => ["Received", "System"].includes(notification.kind) &&
        !state.libReadNotificationIds.has(notification.id),
    ).length;
    qsa(".staff-notification-button").forEach((button) => {
      const image = qs("img", button);
      if (image) image.src = unreadCount ? "assets/notif1.png" : "assets/notif.png";
      const label = unreadCount
        ? `Notifications, ${unreadCount} unread`
        : "Notifications, no unread notifications";
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  }

  function hydrateReportTable(tbodyEl) {
    if (!tbodyEl) return;
    tbodyEl.innerHTML = ADMIN_USERS.map(
      (u) =>
        `<tr><td>${escapeHtml(u.sid)}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.type)}</td><td>${escapeHtml(u.course)}</td></tr>`,
    ).join("");
  }

  function renderAdmUsers() {
    const tbody = qs("#adm-user-rows");
    const users = state.authToken && state.currentUser?.role === "admin" ? state.adminUsers : ADMIN_USERS;
    if (state.adminUserStatus === "pending" && users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="adm-empty-user-state">No account creation requests yet.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(
      (u) =>
        `<tr><td>${escapeHtml(u.schoolId || u.sid || "")}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(
          u.userType || u.type || "",
        )}</td><td>${escapeHtml(u.course || "")}</td><td><span class="account-status account-status-${escapeHtml(u.status || "unknown")}">${escapeHtml(
          u.status || "",
        )}</span></td><td>${
          state.adminUserStatus === "pending"
            ? `<button type="button" class="btn btn-primary sm admin-approve-user" data-user-id="${escapeHtml(u.id)}">Approve</button>`
            : u.status === "deactivated"
              ? `<button type="button" class="btn btn-primary sm admin-activate-user" data-user-id="${escapeHtml(u.id)}">Activate</button>`
              : `<button type="button" class="btn-deactivate admin-deactivate-user" data-user-id="${escapeHtml(u.id)}">Deactivate</button>`
        }</td></tr>`,
    ).join("");
  }

  function renderActivityLog() {
    const tbody = qs("#adm-log-rows");
    tbody.innerHTML = ACTIVITY_LOG.map(
      (row) =>
        `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td><td>${escapeHtml(row[3])}</td></tr>`,
    ).join("");
  }

  function renderAdmCatalog() {
    const tbody = qs("#adm-catalog-table tbody");
    tbody.innerHTML = BOOKS.map((b) => `<tr><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td><td>${escapeHtml(b.isbn)}</td><td>${b.avail}/${b.total}</td></tr>`).join("");
  }

  function renderAdmAnnouncements() {
    const tbody = qs("#adm-ann-rows");
    const rows = [
      ["Announcement", "04/16/2026"],
      ["Announcement", "04/10/2026"],
      ["Announcement", "04/09/2026"],
    ];
    tbody.innerHTML = rows
      .map(
        (r, i) =>
          `<tr><td>${escapeHtml(r[0]) + " #" + (i + 1)}</td><td>${escapeHtml(r[1])}</td><td><button type="button" class="btn btn-outline sm">View</button></td></tr>`,
      )
      .join("");
  }

  function renderReportRequests() {
    const tbody = qs("#adm-req-rows");
    const reqs = [
      { id: "LIB-2026-004", name: "Roberto Villanueva", status: "Request Report" },
      { id: "LIB-2026-003", name: "Angela Ramirez", status: "Approved" },
    ];
    tbody.innerHTML = reqs
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.status)}</td><td><button type="button" class="btn btn-primary sm">${escapeHtml(
            r.status === "Approved" ? "Request Report" : "Request Report",
          )}</button></td></tr>`,
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Delegated clicks */
  document.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const openThreadReply = t.closest("[data-open-thread-reply]");
    if (openThreadReply) {
      await openContactThreadModal(openThreadReply.getAttribute("data-open-thread-reply"), true);
      return;
    }
    const librarianNotificationFilter = t.closest("[data-librarian-notification-filter]");
    if (librarianNotificationFilter) {
      state.libNotificationFilter =
        librarianNotificationFilter.getAttribute("data-librarian-notification-filter") || "all";
      renderLibInbox();
      return;
    }
    const notificationFilter = t.closest("[data-notification-filter]");
    if (notificationFilter) {
      state.notificationFilter = notificationFilter.getAttribute("data-notification-filter") || "all";
      renderMemberNotifications();
      if (state.notificationFilter === "sent") {
        loadMemberSentMessages()
          .then(() => renderMemberNotifications())
          .catch((err) => toast(`Unable to load sent messages: ${err.message}`));
      }
      return;
    }
    const menuToggle = t.closest(".member-user-avatar, .staff-user-avatar");
    if (menuToggle) {
      const menu = menuToggle.closest(".member-user-menu, .staff-user-menu");
      const isOpen = menu?.classList.toggle("is-open") || false;
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      qsa(".member-user-menu.is-open, .staff-user-menu.is-open").forEach((other) => {
        if (other !== menu) {
          other.classList.remove("is-open");
          qs(".member-user-avatar, .staff-user-avatar", other)?.setAttribute("aria-expanded", "false");
        }
      });
      return;
    }
    qsa(".member-user-menu.is-open, .staff-user-menu.is-open").forEach((menu) => {
      if (!menu.contains(t)) {
        menu.classList.remove("is-open");
        qs(".member-user-avatar, .staff-user-avatar", menu)?.setAttribute("aria-expanded", "false");
      }
    });
    const editLibrarianProfile = t.closest('[data-action="lib-edit-profile"]');
    if (editLibrarianProfile) {
      const menu = editLibrarianProfile.closest(".staff-user-menu");
      menu?.classList.remove("is-open");
      if (menu) qs(".staff-user-avatar", menu)?.setAttribute("aria-expanded", "false");
      openLibrarianProfileModal();
      return;
    }
    const closer = t.closest("[data-close-modal]");
    if (closer && closer.contains(t)) closeModal();

    const categoriesToggle = t.closest("[data-catalog-categories-toggle]");
    if (categoriesToggle) {
      state.catalogCategoriesOpen = !state.catalogCategoriesOpen;
      hydrateMemberSidebars();
      return;
    }

    const catalogCategory = t.closest("[data-catalog-category]");
    if (catalogCategory && !catalogCategory.classList.contains("member-category-card")) {
      state.catalogCategory = catalogCategory.getAttribute("data-catalog-category") || "All Books";
      state.catalogCategoriesOpen = state.catalogCategory !== "All Books";
      navigate("member-catalog");
      return;
    }

    const go = t.closest("[data-go]");
    if (go) {
      e.preventDefault();
      if (els.modalRoot.contains(go)) closeModal();
      navigate(go.getAttribute("data-go"));
    }

    const catalogToggle = t.closest("[data-catalog-toggle]");
    if (catalogToggle) {
      const sidebar = catalogToggle.closest(".member-sidebar");
      const subnav = qs("[data-catalog-subnav]", sidebar);
      const isOpen = subnav?.classList.toggle("is-open") || false;
      catalogToggle.classList.toggle("active", isOpen);
      catalogToggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) navigate("member-catalog");
      return;
    }

    const contactToggle = t.closest("[data-contact-toggle]");
    if (contactToggle) {
      state.contactSectionsOpen = !state.contactSectionsOpen;
      hydrateMemberSidebars();
      if (state.contactSectionsOpen) navigate("member-contact");
      return;
    }

    const approveUser = t.closest(".admin-approve-user");
    if (approveUser) {
      try {
        await postJson(`/users/${approveUser.getAttribute("data-user-id")}/approve`, {});
        toast("User account approved. Approval SMS sent (demo mode).");
        await loadAdminUsers("pending");
        await loadAdminDashboardStats();
      } catch (err) {
        toast(`Unable to approve account: ${err.message}`);
      }
      return;
    }

    const deactivateUser = t.closest(".admin-deactivate-user");
    if (deactivateUser) {
      deactivateUser.disabled = true;
      try {
        await postJson(`/users/${deactivateUser.getAttribute("data-user-id")}/deactivate`, {});
        toast("Account deactivation successful.");
      } catch (err) {
        deactivateUser.disabled = false;
        toast(`Unable to deactivate account: ${err.message}`);
        return;
      }
      try {
        await loadAdminUsers("all");
        await loadAdminDashboardStats();
      } catch (err) {
        toast(`Account deactivated, but the user list could not be refreshed: ${err.message}`);
      }
      return;
    }

    const activateUser = t.closest(".admin-activate-user");
    if (activateUser) {
      activateUser.disabled = true;
      try {
        await postJson(`/users/${activateUser.getAttribute("data-user-id")}/activate`, {});
        toast("Account reactivation successful.");
      } catch (err) {
        activateUser.disabled = false;
        toast(`Unable to activate account: ${err.message}`);
        return;
      }
      try {
        await loadAdminUsers("all");
        await loadAdminDashboardStats();
      } catch (err) {
        toast(`Account reactivated, but the user list could not be refreshed: ${err.message}`);
      }
      return;
    }

    const addCart = t.closest(".add-cart");
    if (addCart) {
      const bookId = addCart.getAttribute("data-book");
      const book = getBook(bookId);
      if (!book) return;
      if (book.avail <= 0) {
        toast("This book cannot be added to your cart because it is currently unavailable.");
        return;
      }
      if (book.avail === 1) {
        toast("This book cannot be added to your cart because the last available copy must remain in the library.");
        return;
      }
      if (hasPendingRequest(bookId)) {
        toast("You have already sent a borrow request for this book.");
        return;
      }
      if (hasBorrowedBook(bookId)) {
        toast("This book is already in your borrowed books.");
        return;
      }
      if (state.cart.has(bookId)) {
        toast("This book is already in your cart.");
        return;
      }
      state.cart.add(bookId);
      saveMemberCart();
      renderCatalog();
      toast("Added to cart");
      return;
    }
    const remCart = t.closest(".remove-cart");
    if (remCart) {
      state.cart.delete(remCart.getAttribute("data-book"));
      saveMemberCart();
      renderCart();
      toast("Removed from cart");
      return;
    }
    const bw = t.closest(".borrow-now");
    if (bw) {
      modalBorrow(bw.getAttribute("data-book"), bw.hasAttribute("data-from-cart"));
      return;
    }

    const borrowAll = t.closest("#borrow-all");
    if (borrowAll) {
      modalBorrowAll();
      return;
    }

    const readSent = t.closest(".read-sent-message");
    if (readSent) {
      const message = state.sentMessages[Number(readSent.getAttribute("data-si"))];
      if (!message) return;
      await openContactThreadModal(message.threadId, false);
      return;
    }

    const replySent = t.closest(".reply-sent-message");
    if (replySent) {
      const message = state.sentMessages[Number(replySent.getAttribute("data-si"))];
      if (message) await openContactThreadModal(message.threadId, true);
      return;
    }

    const replyNotification = t.closest(".reply-msg");
    if (replyNotification) {
      const notification = state.notifications[Number(replyNotification.getAttribute("data-ni"))];
      if (notification?.threadId) await openContactThreadModal(notification.threadId, true);
      return;
    }

    const read = t.closest(".read-msg");
    if (read) {
      const notification = state.notifications[Number(read.getAttribute("data-ni"))];
      if (!notification) return;
      if (!notification.read && notification.id && state.authToken) {
        try {
          await putJson(`/notifications/${encodeURIComponent(notification.id)}/read`, {});
        } catch (err) {
          toast(`Unable to mark notification as read: ${err.message}`);
          return;
        }
      }
      notification.read = true;
      renderMemberNotifications();
      if (notification.threadId) {
        await openContactThreadModal(notification.threadId, false);
        return;
      }
      openModal(`
        <div class="modal-sheet-pdf modal-sheet-green member-notification-detail-modal">
          <div class="modal-head-pdf modal-head-green">
            <h3>${escapeHtml(notification.title)}</h3>
            <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
          </div>
          <div class="modal-body-pdf">
            <div class="notice-meta">${escapeHtml(formatNotificationDate(notification.date))}</div>
            ${notification.repliedMessage ? `<div class="member-notification-detail-message"><strong class="member-notification-detail-label">Your Message:</strong><p>${escapeHtml(notification.repliedMessage)}</p></div>` : ""}
            <div class="member-notification-detail-message"><strong class="member-notification-detail-label">Replied:</strong><p>${escapeHtml(notification.body)}</p></div>
            <div class="modal-foot-pdf">
              <button type="button" class="btn-submit-request" data-close-modal>Close</button>
            </div>
          </div>
        </div>`);
    }

    const rm = t.closest(".remove-note");
    if (rm) {
      const i = Number(rm.getAttribute("data-ni"));
      const notification = state.notifications[i];
      if (notification?.id && state.authToken) {
        try {
          await deleteJson(`/notifications/${notification.id}`);
        } catch (err) {
          toast(`Unable to remove notification: ${err.message}`);
          return;
        }
      }
      state.notifications.splice(i, 1);
      renderMemberNotifications();
    }

    const apr = t.closest(".apr");
    if (apr) {
      const i = Number(apr.getAttribute("data-i"));
      const request = state.pendingApprove.splice(i, 1)[0];
      const serverBackedRequest = request?.transactionId && state.authToken;
      let approvalDates = null;
      if (request?.transactionId && state.authToken) {
        try {
          approvalDates = await postJson(`/transactions/${request.transactionId}/approve`, {});
        } catch (err) {
          state.pendingApprove.splice(i, 0, request);
          toast(`Unable to approve request: ${err.message}`);
          renderLibBorrowTabs("borrow");
          return;
        }
      }
      if (request) {
        const borrowedDate = approvalDates?.borrowDate || new Date().toLocaleDateString("en-US");
        const dueDate = approvalDates?.dueDate || borrowedDate;
        state.borrowed.unshift({ bookId: request.bookId, borrowed: borrowedDate, due: dueDate, user: request.user });
        addNotification({
          date: borrowedDate,
          title: "Borrow Request Approved",
          body: `Your request to borrow ${request.book} was approved.`,
          read: false,
        });
      }
      if (serverBackedRequest) {
        try {
          await loadPendingTransactions("borrow");
        } catch (err) {
          toast(`Borrow request approved, but the request list could not be refreshed: ${err.message}`);
          renderLibBorrowTabs("borrow");
        }
      } else {
        renderLibBorrowTabs("borrow");
      }
      if (qs("#catalog-table")) renderCatalog();
      if (qs("#cart-table")) renderCart();
      if (qs("#txn-table")) renderTransactionsTable();
      toast("Borrow request approved");
      return;
    }
    const dec = t.closest(".dec");
    if (dec) {
      const i = Number(dec.getAttribute("data-i"));
      const request = state.pendingApprove.splice(i, 1)[0];
      const serverBackedRequest = request?.transactionId && state.authToken;
      if (request?.transactionId && state.authToken) {
        try {
          await postJson(`/transactions/${request.transactionId}/decline`, {});
        } catch (err) {
          state.pendingApprove.splice(i, 0, request);
          toast(`Unable to decline request: ${err.message}`);
          renderLibBorrowTabs("borrow");
          return;
        }
      }
      if (request) {
        addNotification({
          date: "04/16/2026",
          title: "Borrow Request Declined",
          body: `Your request to borrow ${request.book} was declined.`,
          read: false,
        });
      }
      if (serverBackedRequest) {
        try {
          await loadPendingTransactions("borrow");
        } catch (err) {
          toast(`Borrow request declined, but the request list could not be refreshed: ${err.message}`);
          renderLibBorrowTabs("borrow");
        }
      } else {
        renderLibBorrowTabs("borrow");
      }
      if (qs("#catalog-table")) renderCatalog();
      if (qs("#cart-table")) renderCart();
      if (qs("#txn-table")) renderTransactionsTable();
      toast("Borrow request declined");
    }

    const markReturned = t.closest(".mark-returned");
    if (markReturned) {
      const i = Number(markReturned.getAttribute("data-i"));
      const request = state.pendingReturns[i];
      if (!request) return;
      const serverBackedRequest = request?.transactionId && state.authToken;
      if (serverBackedRequest) {
        try {
          await postJson(`/transactions/${request.transactionId}/return`, {});
        } catch (err) {
          toast(`Unable to mark book as returned: ${err.message}`);
          return;
        }
      } else {
        state.pendingReturns.splice(i, 1);
        const borrowedIndex = state.borrowed.findIndex(
          (book) => book.bookId === request.bookId && (!book.user || book.user === request.user),
        );
        if (borrowedIndex >= 0) state.borrowed.splice(borrowedIndex, 1);
        const book = getBook(request.bookId);
        if (book) book.avail += 1;
        addNotification({
          date: currentDateMMDDYYYY(),
          title: "Book Return Confirmed",
          body: `Your return of ${request.book} has been recorded.`,
          read: false,
        });
      }
      if (serverBackedRequest) {
        try {
          await loadPendingTransactions("return");
        } catch (err) {
          toast(`Book marked returned, but the list could not be refreshed: ${err.message}`);
          renderLibBorrowTabs("return");
        }
      } else {
        renderLibBorrowTabs("return");
      }
      if (qs("#txn-table")) renderTransactionsTable();
      toast("Book marked as returned.");
      return;
    }

    const sms = t.closest(".sms");
    if (sms) {
      const overdue = state.overdueRows[Number(sms.getAttribute("data-i"))];
      if (!overdue) {
        toast("Unable to send the overdue notice because the borrower record is unavailable.");
        return;
      }
      sms.disabled = true;
      try {
        const result = await postJson("/sms/overdue-notice", {
          phone: overdue.phone,
          userName: overdue.user,
          bookTitle: overdue.book,
          dueDate: overdue.due,
        });
        toast(result.mock ? "Overdue notice recorded (SMS demo mode)." : "Overdue notice sent by SMS.");
      } catch (err) {
        sms.disabled = false;
        toast(`Unable to send overdue notice: ${err.message}`);
      }
      return;
    }

    const readL = t.closest(".btn-read-msg, .btn-reply-msg");
    if (readL) {
      const notification = state.libInbox[Number(readL.getAttribute("data-idx"))];
      const isReply = readL.classList.contains("btn-reply-msg");
      if (notification?.id && state.currentUser?.id) {
        state.libReadNotificationIds.add(notification.id);
        localStorage.setItem(
          `ggc-librarian-read-${state.currentUser.id}`,
          JSON.stringify(Array.from(state.libReadNotificationIds)),
        );
        renderLibInbox();
        renderLibAnnouncements();
        renderLibrarianNotifications();
      }
      if (["Received", "Sent"].includes(notification?.kind) && notification.threadId) {
        await openContactThreadModal(notification.threadId, isReply);
        return;
      }
      if (isReply) {
        toast("Unable to reply because this message is not linked to a conversation.");
        return;
      }
      openModal(`
        <div class="modal-sheet-pdf modal-sheet-green lib-notification-detail-modal">
          <div class="modal-head-pdf modal-head-green">
            <h3>${notification?.kind === "Announcement" ? "Announcement Details" : "Message Details"}</h3>
            <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
          </div>
          <div class="modal-body-pdf">
            <dl class="lib-notification-detail-meta">
              <div><dt>Type</dt><dd>${escapeHtml(notification?.kind || "Notification")}${notification?.source ? ` · ${escapeHtml(notification.source)}` : ""}</dd></div>
              <div><dt>${notification?.kind === "Sent" ? "To" : "From"}</dt><dd>${escapeHtml(notification?.kind === "Sent" ? notification.to || "Library user" : notification?.from || "System")}</dd></div>
              <div><dt>Date</dt><dd>${escapeHtml(notification ? formatNotificationTimestamp({ createdAt: notification.createdAt, date: notification.date }) : "—")}</dd></div>
            </dl>
            <div class="lib-notification-detail-message">
              <span class="lib-notification-detail-label">Message</span>
              <p>${escapeHtml(notification?.excerpt || "Notification details are unavailable.")}</p>
            </div>
            <div class="modal-foot-pdf">
              <button type="button" class="btn-submit-request" data-close-modal>Close</button>
            </div>
          </div>
        </div>
      `);
      return;
    }

    const eb = t.closest(".btn-edit-book");
    if (eb) {
      const book = BOOKS.find((item) => item.id === eb.getAttribute("data-book"));
      if (!book) {
        toast("Unable to edit book: book is no longer in the catalog.");
        return;
      }
      openBookEditModal(book);
      return;
    }

    /* History message */
    const hm = t.closest(".hist-msg");
    if (hm) {
      openModal(`
        <div class="modal-sheet-pdf modal-sheet-green lib-message-modal">
          <div class="modal-head-pdf modal-head-green">
            <h3>Message ${escapeHtml(hm.getAttribute("data-user-name") || "User")}</h3>
            <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
          </div>
          <form id="lib-history-message-form" data-user-id="${escapeHtml(hm.getAttribute("data-user-id") || "")}">
            <div class="modal-body-pdf">
              <label for="lib-history-message-input">Message</label>
              <textarea id="lib-history-message-input" name="message" maxlength="500" rows="8" placeholder="Write your message here (maximum of 500 characters)" required></textarea>
              <p class="lib-message-count">Maximum 500 characters</p>
              <div class="modal-foot-pdf">
                <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
                <button type="submit" class="btn-submit-request">Done</button>
              </div>
            </div>
          </form>
        </div>
      `);
      return;
    }

    const hv = t.closest(".hist-view");
    if (hv) {
      const userId = hv.getAttribute("data-user-id");
      const userName = hv.getAttribute("data-user-name") || "User";
      if (!userId) {
        toast("Unable to open user history: user account is missing.");
        return;
      }
      try {
        const rows = await getJson(`/transactions/user/${encodeURIComponent(userId)}`);
        const historyModalClass = rows.length ? "lib-history-modal" : "lib-history-modal lib-history-empty-modal";
        openModal(`
          <div class="modal-sheet-pdf modal-sheet-green ${historyModalClass}">
            <div class="modal-head-pdf modal-head-green">
              <h3>Borrowing History: ${escapeHtml(userName)}</h3>
              <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
            </div>
            <div class="modal-body-pdf">
              ${
                rows.length
                  ? `<div class="table-responsive"><table class="data-table small"><thead><tr><th>BOOK</th><th>AUTHOR</th><th>BORROWED</th><th>DUE</th><th>RETURNED</th><th>STATUS</th></tr></thead><tbody>${rows
                      .map(
                        (row) =>
                          `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.author)}</td><td>${escapeHtml(
                            row.borrowDate || "—",
                          )}</td><td>${escapeHtml(row.dueDate || "—")}</td><td>${escapeHtml(
                            row.returnDate || "—",
                          )}</td><td>${escapeHtml(row.status)}</td></tr>`,
                      )
                      .join("")}</tbody></table></div>`
                  : '<p class="muted">No borrowing history found for this user.</p>'
              }
            </div>
          </div>
        `);
      } catch (err) {
        toast(`Unable to load user history: ${err.message}`);
      }
      return;
    }

    if (t.id === "btn-announce") openAnnouncementComposer();
    const editAnnouncement = t.closest(".btn-edit-announcement");
    if (editAnnouncement) {
      const announcement = state.libInbox[Number(editAnnouncement.getAttribute("data-idx"))];
      if (announcement?.announcementId) {
        openAnnouncementComposer({
          id: announcement.announcementId,
          title: announcement.title,
          body: announcement.excerpt,
          audience: announcement.audience,
          publicationDate: announcement.publicationDate,
        });
      }
      return;
    }
    if (t.id === "lib-announcement-publish-confirm") {
      const button = t;
      const announcement = JSON.parse(button.getAttribute("data-announcement") || "{}");
      button.disabled = true;
      try {
        if (announcement.id) {
          await putJson(`/announcements/${announcement.id}`, announcement);
        } else {
          await postJson("/announcements", announcement);
        }
        closeModal();
        await loadLibrarianInbox();
        toast("Announcement published.");
      } catch (err) {
        button.disabled = false;
        toast(`Unable to publish announcement: ${err.message}`);
      }
    }
    if (t.id === "lib-announcement-publish-cancel") {
      const announcement = JSON.parse(t.getAttribute("data-announcement") || "{}");
      openAnnouncementComposer(announcement);
    }
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    e.preventDefault();
    if (form.id === "contact-thread-reply-form") {
      const threadId = form.getAttribute("data-thread-id");
      const reply = form.elements.reply.value.trim();
      if (!threadId || !reply) return;
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await postJson(`/contact-messages/${encodeURIComponent(threadId)}/reply`, {
          body: reply,
        });
        const isLibrarian = state.currentUser?.role === "librarian";
        closeModal();
        if (isLibrarian) {
          toast("Reply sent to the user.");
          try {
            await loadLibrarianInbox();
          } catch (err) {
            toast(`Reply sent, but the inbox could not be refreshed: ${err.message}`);
          }
        } else {
          toast("Reply sent to the library.");
          try {
            await Promise.all([loadMemberSentMessages(), loadMemberNotifications()]);
            renderMemberNotifications();
          } catch (err) {
            toast(`Reply sent, but the conversation list could not be refreshed: ${err.message}`);
          }
        }
      } catch (err) {
        if (submit) submit.disabled = false;
        toast(`Unable to send reply: ${err.message}`);
      }
      return;
    }
    if (form.id === "lib-announcement-form") {
      const announcement = {
        id: form.getAttribute("data-announcement-id") || "",
        title: form.elements.title.value.trim(),
        body: form.elements.body.value.trim(),
        audience: form.elements.audience.value,
        publicationDate: form.elements.publicationDate.value,
      };
      if (!announcement.title || !announcement.body || !announcement.publicationDate) return;
      const encodedAnnouncement = escapeHtml(JSON.stringify(announcement));
      const audienceLabels = {
        everyone: "Everyone",
        students: "Students",
        faculty: "Faculty / Teachers",
        visitors: "Visitors",
      };
      openModal(`
        <div class="modal-sheet-pdf modal-sheet-green lib-notification-detail-modal">
          <div class="modal-head-pdf modal-head-green"><h3>Confirm Publication</h3></div>
          <div class="modal-body-pdf">
            <p>Review the announcement details before publishing.</p>
            <dl class="lib-notification-detail-meta">
              <div><dt>Title</dt><dd>${escapeHtml(announcement.title)}</dd></div>
              <div><dt>Audience</dt><dd>${escapeHtml(audienceLabels[announcement.audience] || announcement.audience)}</dd></div>
              <div><dt>Publication Date</dt><dd>${escapeHtml(announcement.publicationDate)}</dd></div>
            </dl>
            <div class="lib-notification-detail-message">
              <span class="lib-notification-detail-label">Message</span>
              <p>${escapeHtml(announcement.body)}</p>
            </div>
            <div class="modal-foot-pdf">
              <button type="button" class="btn-cancel-soft" id="lib-announcement-publish-cancel" data-announcement="${encodedAnnouncement}">Cancel</button>
              <button type="button" class="btn-submit-request lib-announcement-confirm-button" id="lib-announcement-publish-confirm" data-announcement="${encodedAnnouncement}">${announcement.id ? "Confirm &amp; Update" : "Confirm &amp; Publish"}</button>
            </div>
          </div>
        </div>
      `);
      return;
    }
    if (form.id !== "lib-history-message-form") return;
    const userId = form.getAttribute("data-user-id");
    const message = form.elements.message.value.trim();
    if (!userId || !message) return;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await postJson(`/users/${encodeURIComponent(userId)}/notifications`, {
        title: "Message from the Library",
        body: message,
      });
      closeModal();
      toast("Message sent to the user.");
    } catch (err) {
      if (submit) submit.disabled = false;
      toast(`Unable to send message: ${err.message}`);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    qsa(".member-user-menu.is-open, .staff-user-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      qs(".member-user-avatar, .staff-user-avatar", menu)?.setAttribute("aria-expanded", "false");
    });
  });

  function getLoginFormField(form, ...names) {
    const candidates = names.flatMap((name) => {
      const direct = form?.elements?.namedItem?.(name);
      if (direct && typeof direct.value === "string") return [direct.value];
      if (form && form[name] && typeof form[name].value === "string") return [form[name].value];
      return [];
    });

    const match = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    return match ? match.trim() : "";
  }

  function demoLoginResult(role, identifier, password) {
    const config = DEMO_CREDENTIALS[role];
    if (!config) return null;

    const expectedIdentifier = String(config.username || config.name || config.schoolId || "").trim();
    const expectedPassword = String(config.password || "").trim();
    if (!expectedIdentifier || !expectedPassword) return null;

    const providedIdentifier = String(identifier || "").trim().toLowerCase();
    const providedPassword = String(password || "").trim();
    const expectedIdentifierLower = expectedIdentifier.toLowerCase();

    if (role === "member") {
      const matchesName = providedIdentifier === String(config.name || "").trim().toLowerCase();
      if (matchesName && providedPassword === expectedPassword) {
        return {
          token: "demo-member-token",
          user: {
            id: 1,
            role: "member",
            name: config.name,
            schoolId: config.schoolId,
            username: config.name,
            email: `${config.name}@ggc.edu.ph`,
            phone: "+639174444444",
          },
        };
      }

      return null;
    }

    if (providedIdentifier === expectedIdentifierLower && providedPassword === expectedPassword) {
      return {
        token: `demo-${role}-token`,
        user: {
          id: 1,
          role,
          name: expectedIdentifier,
          username: expectedIdentifier,
        },
      };
    }

    return null;
  }

  function resetFreshMemberState() {
    state.cart.clear();
    state.borrowed = [];
    state.notifications = [];
    state.memberTransactions = [];
    state.txn = [];
    state.pendingApprove = [];
    state.pendingReturns = [];
  }

  /** Forms */
  async function completeLogin(result) {
    const role = String(result.user?.role || "").toLowerCase();
    const destination = ROLE_DESTINATIONS[role];
    if (role === "staff") {
      toast("Staff authentication is not available yet. Please contact a librarian.");
      return;
    }
    if (!destination) {
      toast("This account role is not supported for sign-in yet.");
      return;
    }

    state.authToken = result.token;
    state.currentUser = result.user;
    state.currentMemberName = result.user.name || "Member";
    state.currentMemberPhone = result.user.phone || "";
    if (result.user.freshAccount) {
      resetFreshMemberState();
      saveMemberCart();
    } else if (role === "member" || role === "visitor") {
      restoreMemberCart();
    }
    if (!continueAfterLogin(role, destination)) return;

    if (role === "member" || role === "visitor") {
      try {
        await Promise.all([loadMemberTransactions(), loadMemberNotifications()]);
      } catch (err) {
        toast(`Unable to load account activity: ${err.message}`);
      }
    }
    if (role === "librarian") {
      try {
        await loadPendingTransactions();
      } catch (err) {
        toast(`Unable to load borrowing and return records: ${err.message}`);
      }
    }
    toast(`Signed in as ${state.currentMemberName}`);
  }

  async function submitLogin(ev) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const identifier = getLoginFormField(form, "identifier", "username", "Username", "userName", "name", "email");
    const password = getLoginFormField(form, "password", "Password");
    if (!identifier || !password) {
      toast("Enter your login credentials.");
      return;
    }

    let result;
    try {
      result = await postJson("/auth/login", { identifier, password });
    } catch (err) {
      result = demoLoginResult("member", identifier, password);
      if (!result) {
        toast(err.message || "Unable to sign in.");
        return;
      }
    }
    await completeLogin(result);
  }

  qs("#form-login")?.addEventListener("submit", submitLogin);

  qs("#form-register")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const name = form.name.value.trim();
    const phone = toE164Phone(form.phone.value);
    const schoolId = form.sid.value.trim().replace(/\s+/g, "").toUpperCase();
    const password = form.password.value;
    const repeatPassword = form.repeatPassword.value;

    if (!name || !phone || !schoolId || !password) {
      toast("Please complete all required fields.");
      return;
    }
    if (!phone.startsWith("+")) {
      toast("Use a valid phone number (e.g. +639171234567).");
      return;
    }
    if (password !== repeatPassword) {
      toast("Passwords do not match.");
      return;
    }

    try {
      const otpRes = await postJson("/sms/send-otp", { phone, name });
      state.pendingMemberSignup = {
        role: "member",
        name,
        email: form.email.value.trim().toLowerCase(),
        phone,
        schoolId,
        userType: form.userType.value,
        course: form.course.value,
        password,
      };
      const otpPhoneDemo = document.getElementById("otp-phone-demo");
      if (otpPhoneDemo) otpPhoneDemo.textContent = phone;
      sec = 300;
      navigate("otp-signup");
      toast(otpRes.mock && otpRes.devCode ? `DEV OTP: ${otpRes.devCode}` : "OTP sent via SMS.");
    } catch (err) {
      toast(`OTP send failed: ${err.message}`);
      return;
    }
  });

  qs("#form-register-visitor")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const phone = toE164Phone(form.phone.value);
    const organization = form.organization.value.trim();
    const password = form.password.value;

    if (!name || !email || !phone || !organization || !password) {
      toast("Please complete all required fields.");
      return;
    }
    if (!phone.startsWith("+")) {
      toast("Use a valid phone number (e.g. +639171234567).");
      return;
    }
    if (password !== form.repeatPassword.value) {
      toast("Passwords do not match.");
      return;
    }

    try {
      const otpRes = await postJson("/sms/send-otp", { phone, name });
      state.pendingMemberSignup = {
        role: "visitor",
        name,
        email,
        phone,
        schoolId: organization,
        userType: "Visitor",
        course: null,
        password,
      };
      const otpPhoneDemo = document.getElementById("otp-phone-demo");
      if (otpPhoneDemo) otpPhoneDemo.textContent = phone;
      sec = 300;
      navigate("otp-signup");
      toast(otpRes.mock && otpRes.devCode ? `DEV OTP: ${otpRes.devCode}` : "OTP sent via SMS.");
    } catch (err) {
      toast(`OTP send failed: ${err.message}`);
    }
  });

  qs("#otp-signup-submit")?.addEventListener("click", async () => {
    if (state.pendingMemberSignup) {
      const code = (document.getElementById("otp-signup-input")?.value || "").trim();
      if (!code) {
        toast("Please enter the OTP code.");
        return;
      }
      try {
        await postJson("/sms/verify-otp", {
          phone: state.pendingMemberSignup.phone,
          code,
        });
      } catch (err) {
        toast(`OTP verification failed: ${err.message}`);
        return;
      }
      try {
        await postJson("/auth/register", {
          name: state.pendingMemberSignup.name,
          email: state.pendingMemberSignup.email,
          phone: state.pendingMemberSignup.phone,
          schoolId: state.pendingMemberSignup.schoolId,
          userType: state.pendingMemberSignup.userType,
          course: state.pendingMemberSignup.course,
          password: state.pendingMemberSignup.password,
          role: state.pendingMemberSignup.role,
        });
      } catch (err) {
        toast(`Registration failed: ${err.message}`);
        return;
      }
      state.currentMemberName = state.pendingMemberSignup.name;
      state.currentMemberPhone = state.pendingMemberSignup.phone;
      state.pendingMemberSignup = null;
      toast("Account submitted. Wait for administrator approval before signing in.");
    } else {
      toast("Account verified — await librarian approval.");
    }
    navigate("login-pick");
  });

  qs("#otp-signup-resend")?.addEventListener("click", async () => {
   const signup = state.pendingMemberSignup;
   if (!signup) return;

   if (sec > 0) {
     toast("OTP request is currently ongoing. Please wait for the timer to run out.");
     return;
   }

   const resendButton = qs("#otp-signup-resend");
   resendInProgress = true;
   if (resendButton) resendButton.hidden = true;
   try {
     const otpRes = await postJson("/sms/send-otp", {
       phone: signup.phone,
       name: signup.name,
     });
     sec = 300;
     resendInProgress = false;
     if (resendButton) resendButton.hidden = true;
     if (otpRes.mock && otpRes.devCode) {
       toast(`DEV OTP: ${otpRes.devCode}`);
     } else {
       toast("A new OTP was sent via SMS.");
     }
   } catch (err) {
     resendInProgress = false;
     if (resendButton) resendButton.hidden = sec > 0;
     toast(`OTP resend failed: ${err.message}`);
   }
  });

  qs("#form-forgot")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const contactNumber = qs("#forgot-contact-number")?.value.trim();
    const otpPhone = qs("#otp-forgot-phone");
    if (otpPhone) otpPhone.textContent = contactNumber;
    navigate("otp-forgot");
  });

  qs("#otp-forgot-ok")?.addEventListener("click", () => {
    navigate("reset-password");
  });

  qs("#form-reset")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    toast("Password updated");
    navigate("login");
  });

  qs("#member-contact-form")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!state.composedMemberMessage) return;
    const send = qs("#send-member-message");
    if (send) send.disabled = true;
    try {
      await postJson("/contact", {
        reason: state.composedMemberReason,
        message: state.composedMemberMessage,
      });
      toast("Message sent — thank you.");
      state.composedMemberMessage = "";
      state.composedMemberReason = "";
      renderMemberMessagePreview();
      try {
        await loadMemberSentMessages();
        if (state.notificationFilter === "sent") renderMemberNotifications();
      } catch (err) {
        toast(`Message sent, but conversations could not be refreshed: ${err.message}`);
      }
    } catch (err) {
      toast(`Unable to send message: ${err.message}`);
    } finally {
      if (send) send.disabled = false;
    }
  });

  function openMemberComposeModal() {
    openModal(`
      <div class="modal-sheet-pdf modal-sheet-green member-compose-modal">
        <div class="modal-head-pdf modal-head-green">
          <h3>Compose A Message</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <form id="member-compose-form">
          <div class="modal-body-pdf">
            <label for="member-contact-reason">Contact reason</label>
            <select id="member-contact-reason" required>
              <option value="">Select a reason</option>
              ${["Borrowing concern", "Returning books", "Account or profile issue", "Book availability", "Technical problem", "General inquiry"]
                .map((reason) => `<option value="${reason}"${state.composedMemberReason === reason ? " selected" : ""}>${reason}</option>`)
                .join("")}
            </select>
            <label for="member-compose-input">Message</label>
            <textarea id="member-compose-input" maxlength="500" rows="8" placeholder="Write your message here (maximum of 500 characters)" required>${escapeHtml(state.composedMemberMessage)}</textarea>
            <p class="member-compose-count">Maximum 500 characters</p>
            <div class="modal-foot-pdf">
              <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
              <button type="submit" class="btn-submit-request">Done</button>
            </div>
          </div>
        </form>
      </div>`);
    qs("#member-compose-input")?.focus();
  }

  function openLibrarianProfileModal() {
    const librarian = state.currentUser;
    if (!librarian || librarian.role !== "librarian") {
      toast("Librarian profile is unavailable.");
      return;
    }
    openModal(`
      <div class="modal-sheet-pdf modal-sheet-green">
        <div class="modal-head-pdf modal-head-green">
          <h3>Edit Profile</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <form id="librarian-profile-form">
          <div class="modal-body-pdf librarian-profile-form">
            <label for="librarian-profile-name">Name</label>
            <input id="librarian-profile-name" name="name" type="text" maxlength="255" value="${escapeHtml(librarian.name || "")}" required />
            <label for="librarian-profile-username">Username</label>
            <input id="librarian-profile-username" name="username" type="text" maxlength="255" value="${escapeHtml(librarian.username || "")}" required autocomplete="username" />
            <label for="librarian-profile-email">Email</label>
            <input id="librarian-profile-email" name="email" type="email" maxlength="255" value="${escapeHtml(librarian.email || "")}" required autocomplete="email" />
            <label for="librarian-profile-current-password">Current password</label>
            <input id="librarian-profile-current-password" name="currentPassword" type="password" autocomplete="current-password" />
            <label for="librarian-profile-new-password">New password <span class="muted">(leave blank to keep current password)</span></label>
            <input id="librarian-profile-new-password" name="newPassword" type="password" autocomplete="new-password" />
            <label for="librarian-profile-confirm-password">Confirm new password</label>
            <input id="librarian-profile-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" />
            <div class="modal-foot-pdf">
              <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
              <button type="submit" class="btn-submit-request">Save Changes</button>
            </div>
          </div>
        </form>
      </div>`);
    qs("#librarian-profile-name", els.modalBody)?.focus();
  }

  qs("#compose-member-message")?.addEventListener("click", openMemberComposeModal);
  qs("#edit-member-message")?.addEventListener("click", openMemberComposeModal);

  document.addEventListener("submit", (ev) => {
    if (ev.target.id !== "member-compose-form") return;
    ev.preventDefault();
    const reason = qs("#member-contact-reason")?.value;
    const message = qs("#member-compose-input")?.value.trim();
    if (!reason || !message) return;
    state.composedMemberReason = reason;
    state.composedMemberMessage = message;
    closeModal();
    renderMemberMessagePreview();
  });

  document.addEventListener("submit", async (ev) => {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "librarian-profile-form") return;
    ev.preventDefault();
    const name = form.elements.name.value.trim();
    const username = form.elements.username.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;
    if (!name || !username || !email) {
      toast("Name, username, and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid email address.");
      return;
    }
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        toast("Enter your current password to change it.");
        return;
      }
      if (newPassword.length < 8) {
        toast("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast("New password and confirmation do not match.");
        return;
      }
    }
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const result = await postJson("/auth/profile", {
        name,
        username,
        email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      state.currentUser = result.user;
      state.currentMemberName = result.user.name || name;
      const saved = JSON.parse(sessionStorage.getItem("ggc-library-session") || "null");
      if (saved?.user) {
        saved.user = result.user;
        sessionStorage.setItem("ggc-library-session", JSON.stringify(saved));
      }
      closeModal();
      refreshChrome(state.activeView);
      toast("Profile updated.");
    } catch (err) {
      if (submit) submit.disabled = false;
      toast(`Unable to update profile: ${err.message}`);
    }
  });

  qs("#member-profile-form")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;
    if (!name || !email) {
      toast("Name and email are required.");
      return;
    }
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        toast("Enter your current password to change it.");
        return;
      }
      if (newPassword.length < 8) {
        toast("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast("New password and confirmation do not match.");
        return;
      }
    }
    try {
      let updatedUser;
      if (state.authToken && !state.authToken.startsWith("demo-")) {
        const result = await postJson("/auth/profile", {
          name,
          email,
          phone,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        });
        updatedUser = result.user;
      } else {
        if (newPassword && (state.authToken !== "demo-member-token" || currentPassword !== DEMO_CREDENTIALS.member.password)) {
          toast("Current password is incorrect.");
          return;
        }
        if (newPassword && state.authToken === "demo-member-token") {
          DEMO_CREDENTIALS.member.password = newPassword;
        }
        updatedUser = { ...(state.currentUser || {}), name, email, phone };
      }
      state.currentUser = updatedUser;
      state.currentMemberName = name;
      state.currentMemberPhone = phone;
      const saved = JSON.parse(sessionStorage.getItem("ggc-library-session") || "null");
      if (saved?.user) {
        saved.user = updatedUser;
        sessionStorage.setItem("ggc-library-session", JSON.stringify(saved));
      }
      hydrateMemberProfiles();
      form.elements.currentPassword.value = "";
      form.elements.newPassword.value = "";
      form.elements.confirmPassword.value = "";
      toast("Profile updated.");
    } catch (err) {
      toast(`Unable to update profile: ${err.message}`);
    }
  });

  async function logout() {
    try {
      if (state.authToken) await postJson("/auth/logout", {});
    } catch (err) {
      toast(`Logout warning: ${err.message}`);
    } finally {
      qsa("#form-login").forEach((form) => {
        form.reset();
        qsa("input", form).forEach((input) => {
          input.value = "";
          input.removeAttribute("value");
        });
      });
      state.authToken = "";
      state.currentUser = null;
      state.currentMemberName = "";
      state.currentMemberPhone = "";
      state.cart.clear();
      sessionStorage.removeItem("ggc-library-session");
      if (standaloneEntryView()) {
        window.location.href = "index.html";
        return;
      }
      navigate("login-pick");
      toast("Logged out");
    }
  }

  qs("#confirm-member-logout")?.addEventListener("click", logout);
  qs("#confirm-lib-logout")?.addEventListener("click", logout);
  qs("#confirm-adm-logout")?.addEventListener("click", logout);

  qs("#catalog-search")?.addEventListener("input", renderCatalog);

  qsa("[data-catalog-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.catalogCategory = button.getAttribute("data-catalog-category") || "All Books";
      qsa("[data-catalog-category]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      if (button.classList.contains("member-category-card")) {
        navigate("member-catalog", { preserveCatalogCategory: true });
      }
      renderCatalog();
    });
  });

  qs("#lib-inv-search")?.addEventListener("input", renderLibInventory);

  qs("#save-lib-borrowing-duration")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const select = qs("#lib-borrowing-duration");
    const facultySelect = qs("#lib-faculty-borrowing-duration");
    const status = qs("#lib-borrowing-duration-status");
    const duration = Number(select?.value);
    const facultyDuration = Number(facultySelect?.value);
    if (![duration, facultyDuration].every((value) => Number.isSafeInteger(value) && value > 0)) {
      toast("Enter positive whole-number returning durations in days for both account types.");
      return;
    }
    button.disabled = true;
    try {
      const policy = await postJson("/library-policy", {
        borrowingDurationDays: duration,
        facultyBorrowingDurationDays: facultyDuration,
      });
      state.libraryPolicyDuration = Number(policy.borrowingDurationDays);
      state.facultyLibraryPolicyDuration = Number(policy.facultyBorrowingDurationDays);
      if (status) {
        status.textContent = `Student and Visitor returns are due in ${duration} days; Faculty and Teachers returns are due in ${facultyDuration} days. Existing loans keep their assigned due dates.`;
      }
      toast("Borrowing policies saved.");
    } catch (err) {
      toast(`Unable to save borrowing policy: ${err.message}`);
    } finally {
      button.disabled = false;
    }
  });

  qsa('[data-btab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      qsa('[data-btab]').forEach((b)=>b.classList.remove('active'));
      btn.classList.add('active');
      renderLibBorrowTabs(btn.getAttribute('data-btab'));
    }),
  );

  qsa("[data-lib-borrow-search]").forEach((input) => {
    input.addEventListener("input", () => filterLibBorrowTable(input));
  });

  /* initial borrowing tab activation */
  const firstBtab = qs('[data-btab="borrow"]');
  firstBtab?.classList.add('active');

  qsa('[data-usersub]').forEach((btn) =>
    btn.addEventListener('click', async ()=> {
      qsa('[data-usersub]').forEach((b)=>b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.getAttribute('data-usersub') === 'confirm' ? 'pending' : 'all';
      try {
        await loadAdminUsers(status);
      } catch (err) {
        toast(`Unable to load user accounts: ${err.message}`);
      }
    }),
  );

  qs('#adm-create-lib')?.addEventListener('submit', (ev)=> {
    ev.preventDefault();
    toast('Librarian account created (demo)');
  });

  qs('#btn-save-sms')?.addEventListener('click', ()=> {
    toast('Auto SMS template saved (demo)');
  });

  qs('#btn-add-book-open')?.addEventListener('click', ()=> {
    openModal(`
      <div class="modal-sheet-pdf modal-sheet-green">
        <div class="modal-head-pdf modal-head-green">
          <h3>Add Book</h3>
          <button type="button" class="modal-close-pdf" data-close-modal aria-label="Close">×</button>
        </div>
        <div class="modal-body-pdf">
          <div class="stack-form" autocomplete="off">
            <label>Book title<input id="nb-title" name="new-book-title" type="text" autocomplete="off"/></label>
            <label>Book author<input id="nb-author" name="new-book-author" type="text" autocomplete="off"/></label>
            <label>ISBN<input id="nb-isbn" name="new-book-isbn" type="text" inputmode="numeric" minlength="10" maxlength="17" placeholder="978-..." autocomplete="off" required /></label>
            <label>Book available<input id="nb-avail" name="new-book-available" type="number" min="1" value="1" autocomplete="off"/></label>
          </div>
          <p class="small muted">By confirming, you can edit book details in catalog management.</p>
          <div class="modal-foot-pdf">
            <button type="button" class="btn-cancel-soft" data-close-modal>Cancel</button>
            <button type="button" class="btn-submit-request" id="modal-add-save">Add Book</button>
          </div>
        </div>
      </div>
    `);
    qs('#modal-add-save', els.modalBody)?.addEventListener('click', async () => {
      const title = qs("#nb-title", els.modalBody)?.value.trim();
      const author = qs("#nb-author", els.modalBody)?.value.trim();
      const isbn = qs("#nb-isbn", els.modalBody)?.value.trim();
      const availableValue = qs("#nb-avail", els.modalBody)?.value.trim();
      const available = Number(availableValue);

      if (!title || !author || !isbn || availableValue === "" || !Number.isInteger(available) || available < 1) {
        toast("Enter a title, author, ISBN, and a valid available book count.");
        return;
      }

      try {
        await postJson("/books", { title, author, isbn, total: available, available });
        await loadBooks();
        closeModal();
        toast("Book added to inventory.");
      } catch (err) {
        toast(`Unable to add book: ${err.message}`);
      }
    });
  });

  /* OTP countdown (signup view) */
  let sec = 300;
  let resendInProgress = false;
  function signupTimerTick() {
    const el = document.getElementById('timer-signup');
    if (!el) return;
    const m = String(Math.floor(sec / 60)).padStart(2,'0');
    const s = String(sec % 60).padStart(2,'0');
    el.textContent = `${m}:${s}`;
     const resendButton = document.getElementById("otp-signup-resend");
     if (resendButton) {
       resendButton.hidden = sec > 0 || resendInProgress;
       resendButton.disabled = false;
     }
     if (sec > 0) sec--;
  }
  setInterval(signupTimerTick, 1000);
  signupTimerTick();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (state.activeView === "adm-dashboard") refreshAdminDashboardStats();
  });

  loadBooks().catch((err) => {
    // The hard-coded catalog remains available when the optional API is offline.
    console.warn("Unable to load books from the library server; using the demo catalog.", err);
  });
  showView(standaloneEntryView() || "home");
})();
