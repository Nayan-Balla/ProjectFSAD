export const normalizeSubmission = (submission = {}) => {
  const normalizedName = submission.name || submission.studentName || "";
  const normalizedMarks =
    submission.marks === undefined || submission.marks === "" ? null : submission.marks;

  return {
    ...submission,
    name: normalizedName,
    studentName: submission.studentName || normalizedName,
    studentEmail: submission.studentEmail || "",
    idNumber: submission.idNumber ?? submission.studentId ?? "",
    marks: normalizedMarks,
  };
};

export const hasAssignedMark = (mark) =>
  mark !== null &&
  mark !== undefined &&
  String(mark).trim() !== "" &&
  !Number.isNaN(Number(mark));

export const formatMark = (mark) => (hasAssignedMark(mark) ? String(mark) : "—");

export const clampMarks = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
};
