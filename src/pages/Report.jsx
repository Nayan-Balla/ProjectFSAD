import { useMemo } from "react";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useRegistrations } from "../context/RegistrationsContext";
import { useAuth } from "../context/AuthContext";
import FileViewDownload from "../components/FileViewDownload";
import { formatMark, hasAssignedMark } from "../utils/submissions";

function Report() {
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const { registrations } = useRegistrations();

  const regCounts = useMemo(() => {
    const students = registrations.filter((registration) => registration.role === "Student").length;
    const admins = registrations.filter((registration) => registration.role === "Admin").length;
    const byDept = {};
    const facultyByDept = {};

    registrations.forEach((registration) => {
      const department = registration.department || "Not specified";
      byDept[department] = (byDept[department] || 0) + 1;
      if (registration.role === "Admin") {
        facultyByDept[department] = (facultyByDept[department] || 0) + 1;
      }
    });

    const byDepartment = Object.entries(byDept)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const facultyByDepartment = Object.entries(facultyByDept)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { students, admins, byDepartment, facultyByDepartment };
  }, [registrations]);

  const withMarks = submissions.filter((submission) => hasAssignedMark(submission.marks)).length;
  const isAdmin = user?.role === "Admin";

  return (
    <MainLayout>
      <div className="report-page">
        <h1 className="report-title">Generate reports</h1>
        <p className="report-subtitle report-subtitle--lead">
          Learning outcomes and assessment reports. Track and evaluate educational effectiveness.
        </p>

        <section className="report-section report-section--public">
          <h2 className="report-section__title">Registration overview (counts only)</h2>
          <p className="report-subtitle">
            Number of registered users. No names or personal data are shown.
          </p>
          <div className="report-stats">
            <div className="report-stats__item">
              <span className="report-stats__value">{regCounts.students}</span>
              <span className="report-stats__label">Students registered</span>
            </div>
            <div className="report-stats__item">
              <span className="report-stats__value">{regCounts.admins}</span>
              <span className="report-stats__label">Admins (Faculty) registered</span>
            </div>
          </div>
          <div className="report-departments">
            <h3 className="report-departments__title">By department (all users)</h3>
            <ul className="report-departments__list">
              {regCounts.byDepartment.length === 0 ? (
                <li className="report-departments__empty">No registrations yet.</li>
              ) : (
                regCounts.byDepartment.map(({ name, count }) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="report-departments report-departments--faculty">
            <h3 className="report-departments__title">Faculty (Admin) departments registered</h3>
            <p className="report-subtitle report-departments__desc">
              Count of faculty registered per department.
            </p>
            <ul className="report-departments__list">
              {regCounts.facultyByDepartment.length === 0 ? (
                <li className="report-departments__empty">No faculty registered yet.</li>
              ) : (
                regCounts.facultyByDepartment.map(({ name, count }) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {isAdmin && (
          <section className="report-section">
            <h2 className="report-section__title">Student outcome report (Admin)</h2>
            <p className="report-subtitle">
              Full list of submissions with student ID, name, course, file, and marks.
            </p>
            <div className="report-card">
              <table className="edu-table report-table">
                <thead>
                  <tr>
                    <th>ID number</th>
                    <th>Name</th>
                    <th>Course</th>
                    <th>File</th>
                    <th>Marks</th>
                    <th>Graded by</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.idNumber}</td>
                      <td>{row.name}</td>
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
              {submissions.length === 0 && (
                <p className="report-empty">No submissions yet.</p>
              )}
            </div>
            <div className="report-summary">
              <p><strong>Total submissions:</strong> {submissions.length}</p>
              <p><strong>Submissions with marks assigned:</strong> {withMarks}</p>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export default Report;
