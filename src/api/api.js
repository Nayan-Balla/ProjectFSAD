const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:2020").replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "sms_auth";

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

const clampMarks = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(100, n));
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
    return { success: false, error: error.message || "Failed to resend OTP." };
  }
};

export const getCourses = async () => {
  const payload = await request("/api/courses", { requireAuth: true });
  return Array.isArray(payload) ? payload : [];
};

export const addCourse = async (course) => {
  const payload = await request("/api/courses", {
    method: "POST",
    requireAuth: true,
    body: course,
  });
  return payload;
};

export const getRegistrations = async () => {
  const payload = await request("/api/registrations", { requireAuth: true });
  return Array.isArray(payload) ? payload : [];
};

export const addRegistration = async (registration) => {
  const payload = await request("/api/registrations", {
    method: "POST",
    requireAuth: true,
    body: registration,
  });
  return payload;
};

export const updateProfile = async (userId, data) => {
  const payload = await request(`/api/users/${userId}`, {
    method: "PUT",
    requireAuth: true,
    body: data,
  });
  return payload;
};

export const getSubmissions = async () => {
  const payload = await request("/api/submissions", { requireAuth: true });
  return Array.isArray(payload)
    ? payload.map((s) => ({
        ...s,
        courseId: s.courseId || getCourseIdFromName(s.course),
      }))
    : [];
};

export const submitAssignment = async (submissionData) => {
  const payload = await request("/api/submissions", {
    method: "POST",
    requireAuth: true,
    body: {
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
    },
  });
  return {
    ...payload,
    courseId: payload.courseId || getCourseIdFromName(payload.course),
  };
};

export const updateSubmissionMarks = async (submission, marks, gradedBy) => {
  const safeMarks = clampMarks(marks);
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
  return payload;
};

export const deleteSubmission = async (id) => {
  await request(`/api/submissions/${id}`, { method: "DELETE", requireAuth: true });
};
