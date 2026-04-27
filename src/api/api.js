import { clampMarks, normalizeSubmission } from "../utils/submissions";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://projectfsad-backend-f4ni.onrender.com"
).replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "sms_auth";
const LOCAL_DB_KEY = "sms_local_db";

const buildUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value || "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const createEmptyDb = () => ({
  users: [],
  registrations: [],
  courses: [],
  submissions: [],
  counters: {
    user: 1,
    registration: 1,
    course: 1,
    submission: 1,
  },
});

const getLocalDb = () => {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return createEmptyDb();
    const parsed = JSON.parse(raw);
    return {
      ...createEmptyDb(),
      ...parsed,
      counters: {
        ...createEmptyDb().counters,
        ...(parsed?.counters || {}),
      },
    };
  } catch {
    return createEmptyDb();
  }
};

const saveLocalDb = (db) => {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  return db;
};

const isFetchFailure = (error) =>
  error instanceof TypeError ||
  String(error?.message || "").toLowerCase().includes("failed to fetch");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const generateToken = (email) => `local-token-${btoa(`${email}:${Date.now()}`)}`;

const upsertCourseLocal = (db, title) => {
  const normalized = (title || "").trim();
  if (!normalized) return null;
  const existing = db.courses.find((course) => course.title.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing;
  const created = {
    id: db.counters.course++,
    title: normalized,
  };
  db.courses.push(created);
  return created;
};

const request = async (path, options = {}) => {
  const { requireAuth = false, headers = {}, body } = options;
  const auth = getStoredAuth();
  const finalHeaders = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };

  if (requireAuth && auth?.token) {
    finalHeaders.Authorization = `Bearer ${auth.token}`;
  }

  const response = await fetch(buildUrl(path), {
    method: options.method || "GET",
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === "string" && payload) ||
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const getCourseIdFromName = (course) => {
  const normalized = (course || "").trim();
  if (!normalized) return "0000";
  const hash = Math.abs(normalized.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return String((hash % 9000) + 1000).padStart(4, "0");
};

export const registerUser = async (userData) => {
  try {
    const payload = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: userData.name?.trim() || "",
        email: userData.email?.trim().toLowerCase() || "",
        password: userData.password || "",
        role: userData.role || "Student",
        department: userData.department || "",
        experience: userData.experience ?? 0,
      },
    });

    return {
      success: true,
      data: {
        id: payload.id,
        name: payload.name || userData.name || "",
        email: userData.email?.trim().toLowerCase() || "",
        role: payload.role || userData.role || "Student",
        department: userData.department || "",
        verified: Boolean(payload.verified),
      },
    };
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const email = userData.email?.trim().toLowerCase() || "";
      if (db.users.some((user) => user.email === email)) {
        return { success: false, error: "Email already registered" };
      }

      const otp = generateOtp();
      const role = userData.role || "Student";
      const createdUser = {
        id: db.counters.user++,
        name: userData.name?.trim() || "",
        email,
        password: userData.password || "",
        role,
        department: userData.department || "",
        experience: userData.experience ?? 0,
        verified: false,
        otp,
      };
      db.users.push(createdUser);
      db.registrations.push({
        id: db.counters.registration++,
        email,
        role,
        department: userData.department || "",
        experience: userData.experience ?? 0,
      });
      saveLocalDb(db);

      return {
        success: true,
        data: {
          id: createdUser.id,
          name: createdUser.name,
          email,
          role,
          department: createdUser.department,
          verified: false,
          otp,
        },
      };
    }
    return { success: false, error: error.message || "Registration failed." };
  }
};

export const loginUser = async (credentials) => {
  try {
    const payload = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: credentials.email?.trim().toLowerCase() || "",
        password: credentials.password || "",
      },
    });

    return {
      success: true,
      data: {
        id: payload.id,
        name: payload.name || "",
        role: payload.role || "Student",
        verified: Boolean(payload.verified),
        token: payload.token || "",
        email: credentials.email?.trim().toLowerCase() || "",
      },
    };
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const email = credentials.email?.trim().toLowerCase() || "";
      const user = db.users.find((entry) => entry.email === email && entry.password === (credentials.password || ""));
      if (!user) {
        return { success: false, error: "Invalid email or password" };
      }
      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          role: user.role,
          department: user.department,
          experience: user.experience ?? 0,
          verified: Boolean(user.verified),
          token: generateToken(user.email),
          email: user.email,
        },
      };
    }
    return { success: false, error: error.message || "Login failed." };
  }
};

export const verifyOtp = async ({ email, otp }) => {
  try {
    const payload = await request("/api/auth/verify", {
      method: "POST",
      body: {
        email: email?.trim().toLowerCase() || "",
        otp: otp?.trim() || "",
      },
    });

    if (typeof payload === "string" && !payload.toLowerCase().includes("verified")) {
      return { success: false, error: payload };
    }

    return { success: true, data: payload };
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const normalizedEmail = email?.trim().toLowerCase() || "";
      const user = db.users.find((entry) => entry.email === normalizedEmail);
      if (!user) return { success: false, error: "User not found" };
      if ((user.otp || "") !== (otp?.trim() || "")) {
        return { success: false, error: "Invalid OTP" };
      }
      user.verified = true;
      user.otp = null;
      saveLocalDb(db);
      return { success: true, data: "Verified successfully" };
    }
    return { success: false, error: error.message || "OTP verification failed." };
  }
};

export const resendOtp = async ({ email }) => {
  try {
    const payload = await request("/api/auth/resend-otp", {
      method: "POST",
      body: {
        email: email?.trim().toLowerCase() || "",
        password: "",
      },
    });

    return { success: true, data: payload };
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const normalizedEmail = email?.trim().toLowerCase() || "";
      const user = db.users.find((entry) => entry.email === normalizedEmail);
      if (!user) return { success: false, error: "User not found" };
      user.otp = generateOtp();
      saveLocalDb(db);
      return { success: true, data: "OTP resent successfully" };
    }
    return { success: false, error: error.message || "Failed to resend OTP." };
  }
};

export const getCourses = async () => {
  try {
    const payload = await request("/api/courses", { requireAuth: true });
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (isFetchFailure(error)) {
      return getLocalDb().courses;
    }
    throw error;
  }
};

export const addCourse = async (course) => {
  try {
    const payload = await request("/api/courses", {
      method: "POST",
      requireAuth: true,
      body: course,
    });
    return payload;
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const created = upsertCourseLocal(db, course?.title || course?.course || "");
      saveLocalDb(db);
      return created;
    }
    throw error;
  }
};

export const getRegistrations = async () => {
  try {
    const payload = await request("/api/registrations", { requireAuth: true });
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (isFetchFailure(error)) {
      return getLocalDb().registrations;
    }
    throw error;
  }
};

export const addRegistration = async (registration) => {
  try {
    const payload = await request("/api/registrations", {
      method: "POST",
      requireAuth: true,
      body: registration,
    });
    return payload;
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const created = {
        id: db.counters.registration++,
        ...registration,
      };
      db.registrations.push(created);
      saveLocalDb(db);
      return created;
    }
    throw error;
  }
};

export const updateProfile = async (userId, data) => {
  try {
    const payload = await request(`/api/users/${userId}`, {
      method: "PUT",
      requireAuth: true,
      body: data,
    });
    return payload;
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const userIdNumber = Number(userId);
      const user = db.users.find((entry) => entry.id === userIdNumber);
      if (!user) {
        throw new Error("User not found");
      }
      Object.assign(user, data);
      const registration = db.registrations.find((entry) => entry.email === user.email);
      if (registration) {
        if (data.department !== undefined) registration.department = data.department;
        if (data.experience !== undefined) registration.experience = data.experience;
        if (data.role !== undefined) registration.role = data.role;
      }
      saveLocalDb(db);
      return user;
    }
    throw error;
  }
};

export const getSubmissions = async () => {
  try {
    const payload = await request("/api/submissions", { requireAuth: true });
    return Array.isArray(payload)
      ? payload.map((s) =>
          normalizeSubmission({
            ...s,
            courseId: s.courseId || getCourseIdFromName(s.course),
          })
        )
      : [];
  } catch (error) {
    if (isFetchFailure(error)) {
      return getLocalDb().submissions.map((s) =>
        normalizeSubmission({
          ...s,
          courseId: s.courseId || getCourseIdFromName(s.course),
        })
      );
    }
    throw error;
  }
};

export const submitAssignment = async (submissionData) => {
  const body = {
    course: submissionData.course,
    courseId: getCourseIdFromName(submissionData.course),
    studentName: submissionData.name,
    studentEmail: submissionData.studentEmail,
    department: submissionData.department,
    idNumber: submissionData.idNumber,
    fileName: submissionData.fileName,
    fileData: submissionData.fileData || "",
    marks: null,
    gradedBy: "",
    feedback: "",
    submittedAt: new Date().toISOString(),
    markedAt: null,
    courseId: getCourseIdFromName(submissionData.course),
    studentId: toNumber(submissionData.idNumber, 0),
  };
  try {
    const payload = await request("/api/submissions", {
      method: "POST",
      requireAuth: true,
      body,
    });
    return normalizeSubmission({
      ...payload,
      courseId: payload.courseId || getCourseIdFromName(payload.course),
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      upsertCourseLocal(db, submissionData.course);
      const created = normalizeSubmission({
        id: db.counters.submission++,
        ...body,
        name: submissionData.name,
      });
      db.submissions.unshift(created);
      saveLocalDb(db);
      return created;
    }
    throw error;
  }
};

export const updateSubmissionMarks = async (submission, marks, gradedBy) => {
  const safeMarks = clampMarks(marks);
  try {
    const payload = await request(`/api/submissions/${submission.id}`, {
      method: "PUT",
      requireAuth: true,
      body: {
        ...submission,
        marks: safeMarks,
        gradedBy,
        markedAt: new Date().toISOString(),
      },
    });
    return normalizeSubmission(payload);
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      const target = db.submissions.find((entry) => entry.id === submission.id);
      if (!target) {
        throw new Error("Submission not found");
      }
      target.marks = safeMarks;
      target.gradedBy = gradedBy || "";
      target.markedAt = new Date().toISOString();
      saveLocalDb(db);
      return normalizeSubmission(target);
    }
    throw error;
  }
};

export const deleteSubmission = async (id) => {
  try {
    await request(`/api/submissions/${id}`, { method: "DELETE", requireAuth: true });
  } catch (error) {
    if (isFetchFailure(error)) {
      const db = getLocalDb();
      db.submissions = db.submissions.filter((entry) => entry.id !== id);
      saveLocalDb(db);
      return;
    }
    throw error;
  }
};
