import { useState, useMemo } from "react";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useRegistrations } from "../context/RegistrationsContext";
import { useAuth } from "../context/AuthContext";
import FileViewDownload from "../components/FileViewDownload";
import { formatMark } from "../utils/submissions";

function FacultyLearningOutcomes() {
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const { registrations } = useRegistrations();
  const [searchQuery, setSearchQuery] = useState("");

  const facultyDepartment = useMemo(() => {
    if (user?.department) return user.department;
    const reg = registrations.find(
      (registration) =>
        registration.role === "Admin" &&
        registration.email &&
        user?.email &&
        registration.email.toLowerCase() === user.email.toLowerCase()
    );
    return reg?.department || "";
  }, [user, registrations]);

  const departmentStudentEmails = useMemo(() => {
    const emails = new Set();
    registrations
      .filter(
        (registration) =>
          registration.role === "Student" &&
          registration.department &&
          facultyDepartment &&
          registration.department === facultyDepartment
      )
      .forEach((registration) => {
        if (registration.email) emails.add(registration.email.toLowerCase());
      });
    return emails;
  }, [registrations, facultyDepartment]);

  const departmentSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      if (!facultyDepartment) return false;
      if (submission.department) return submission.department === facultyDepartment;
      return submission.studentEmail ? departmentStudentEmails.has(submission.studentEmail.toLowerCase()) : false;
    });
  }, [submissions, departmentStudentEmails, facultyDepartment]);

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return departmentSubmissions;
    const q = searchQuery.trim().toLowerCase();
    return departmentSubmissions.filter(
      (submission) =>
        (submission.name && submission.name.toLowerCase().includes(q)) ||
        (submission.idNumber && String(submission.idNumber).toLowerCase().includes(q)) ||
        (submission.studentEmail && submission.studentEmail.toLowerCase().includes(q)) ||
        (submission.course && submission.course.toLowerCase().includes(q))
    );
  }, [departmentSubmissions, searchQuery]);

  return (
    <MainLayout>
      <div className="faculty-outcomes-page">
        <h1 className="page-title">Learning outcomes by department</h1>
        <p className="page-subtitle">
          Student data and learning path for your department. Only students registered in <strong>{facultyDepartment || "your department"}</strong> are shown.
        </p>

        {!facultyDepartment && (
          <div className="faculty-outcomes-alert">
            Your department is not set. Set it when you log in or sign up to see department students here.
          </div>
        )}

        <div className="faculty-outcomes-search-wrap">
          <label htmlFor="faculty-outcomes-search" className="faculty-outcomes-search-label">
            Search students
          </label>
          <input
            id="faculty-outcomes-search"
            type="text"
            className="faculty-outcomes-search-input"
            placeholder="Search by name, ID number, email, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="dashboard-card">
          <h2 className="faculty-outcomes-table-title">Student data and learning path</h2>
          {departmentSubmissions.length === 0 ? (
            <p className="faculty-outcomes-empty">
              {facultyDepartment
                ? "No students in your department have submitted yet, or no students are registered in your department."
                : "Select your department at login to see students here."}
            </p>
          ) : (
            <>
              <div className="faculty-outcomes-table-wrap">
                <table className="edu-table">
                  <thead>
                    <tr>
                      <th>ID number</th>
                      <th>Name</th>
                      <th>Student email</th>
                      <th>Course</th>
                      <th>File</th>
                      <th>Marks</th>
                      <th>Graded by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((row) => (
                      <tr key={row.id}>
                        <td>{row.idNumber}</td>
                        <td>{row.name}</td>
                        <td>{row.studentEmail || "—"}</td>
                        <td>{row.course}</td>
                        <td>
                          <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                        </td>
                        <td><strong>{formatMark(row.marks)}</strong></td>
                        <td>{row.gradedBy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredSubmissions.length === 0 && searchQuery.trim() && (
                <p className="faculty-outcomes-empty">
                  No students match "{searchQuery.trim()}".
                </p>
              )}
              {filteredSubmissions.length > 0 && (
                <p className="faculty-outcomes-count">
                  Showing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
                  {searchQuery.trim() ? " (filtered)" : ""}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default FacultyLearningOutcomes;
