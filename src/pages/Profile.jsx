import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubmissions } from "../context/SubmissionsContext";
import { useRegistrations } from "../context/RegistrationsContext";
import MainLayout from "../layout/MainLayout";
import FileViewDownload from "../components/FileViewDownload";
import { formatMark, hasAssignedMark } from "../utils/submissions";

function Profile() {
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const { registrations } = useRegistrations();

  const userEmail = user?.email?.toLowerCase() || "";
  const isAdmin = user?.role === "Admin";

  const facultyDepartment = useMemo(() => {
    if (user?.department) return user.department;
    const adminRegistration = registrations.find(
      (registration) =>
        registration.role === "Admin" &&
        registration.email &&
        user?.email &&
        registration.email.toLowerCase() === user.email.toLowerCase()
    );
    return adminRegistration?.department || "";
  }, [registrations, user]);

  const departmentStudentEmails = useMemo(() => {
    const emailSet = new Set();
    if (!facultyDepartment) return emailSet;

    registrations.forEach((registration) => {
      if (
        registration.role === "Student" &&
        registration.department === facultyDepartment &&
        registration.email
      ) {
        emailSet.add(registration.email.toLowerCase());
      }
    });

    return emailSet;
  }, [registrations, facultyDepartment]);

  const mySubmissions = useMemo(() => {
    if (isAdmin) {
      if (!facultyDepartment) return [];
      return submissions.filter((submission) => {
        if (submission.department) {
          return submission.department === facultyDepartment;
        }
        return submission.studentEmail
          ? departmentStudentEmails.has(submission.studentEmail.toLowerCase())
          : false;
      });
    }

    if (!userEmail) return [];
    return submissions.filter(
      (submission) => submission.studentEmail?.toLowerCase() === userEmail
    );
  }, [submissions, isAdmin, facultyDepartment, departmentStudentEmails, userEmail]);

  const initials = user?.name ? user.name.trim().slice(0, 2).toUpperCase() : "US";
  const photo = user?.photo || "";

  const totalSubmissions = mySubmissions.length;
  const markedSubmissions = mySubmissions.filter((row) => hasAssignedMark(row.marks)).length;
  const averageMark = mySubmissions
    .map((row) => parseFloat(String(row.marks).replace(/[^\d.]/g, "")))
    .filter((value) => !Number.isNaN(value))
    .reduce((sum, value, _, arr) => sum + value / arr.length, 0);
  const latestSubmissionDate = mySubmissions
    .map((row) => row.submittedAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .sort((a, b) => b - a)[0];

  const stats = {
    primaryLabel: isAdmin ? "Department uploads" : "Total uploads",
    primaryExtra: isAdmin ? "Submissions in your department" : "All assignments submitted",
    secondaryLabel: isAdmin ? "Marked submissions" : "Marked assignments",
    secondaryExtra: isAdmin ? "Graded by you or other faculty" : "Graded by your faculty",
    pageTitle: isAdmin ? "Department submissions" : "Submitted assignments",
    pageCopy: isAdmin
      ? "Review submissions from your department and download any uploaded file."
      : "Review your recent submissions and download any uploaded file.",
    emptyMessage: isAdmin
      ? "No submissions found for your department yet."
      : "No submissions yet. Submit an assignment to see it here.",
  };

  return (
    <MainLayout>
      <div className="profile-page">
        <div className="profile-container">
          <section className="profile-card">
            <div className="profile-card-hero">
              <div className="profile-card-cover" />
              <div className="profile-card-gradient" />

              <div className="profile-card-hero-content">
                <div className="profile-card-avatar-wrap">
                  <div className="profile-card-avatar">
                    {photo ? <img src={photo} alt="Profile" /> : initials}
                  </div>
                </div>

                <div className="profile-card-hero-text">
                  <h1 className="profile-card-title">{user?.name || "Unnamed User"}</h1>
                  <p className="profile-card-subtitle">
                    {user?.department || facultyDepartment || "No department"}
                  </p>

                  <div className="profile-card-chip-row">
                    <span className="profile-badge">{user?.role || "Student"}</span>
                    <span className="profile-email-pill">{user?.email || "No email"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card-details">
              <div className="profile-card-info-row">
                <span className="profile-card-info-icon">✉</span>
                <span>{user?.email || "No email available"}</span>
              </div>
              {isAdmin && user?.experience > 0 && (
                <div className="profile-card-info-row">
                  <span className="profile-card-info-icon">📚</span>
                  <span>{user.experience} years of experience</span>
                </div>
              )}

              <div className="profile-stats-grid">
                <article className="profile-stat-card">
                  <p className="profile-stat-label">{stats.primaryLabel}</p>
                  <h3>{totalSubmissions}</h3>
                  <p className="profile-stat-extra">{stats.primaryExtra}</p>
                </article>

                <article className="profile-stat-card">
                  <p className="profile-stat-label">{stats.secondaryLabel}</p>
                  <h3>{markedSubmissions}</h3>
                  <p className="profile-stat-extra">{stats.secondaryExtra}</p>
                </article>

                {!isAdmin && (
                  <>
                    <article className="profile-stat-card">
                      <p className="profile-stat-label">Latest submission</p>
                      <h3>{latestSubmissionDate ? latestSubmissionDate.toLocaleDateString() : "—"}</h3>
                      <p className="profile-stat-extra">Most recent upload</p>
                    </article>

                    <article className="profile-stat-card">
                      <p className="profile-stat-label">Performance</p>
                      <h3>{mySubmissions.length ? `${averageMark.toFixed(1)}%` : "—"}</h3>
                      <p className="profile-stat-extra">Average mark across submissions</p>
                    </article>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="profile-submissions">
          <div className="profile-submissions-header">
            <div>
              <h2>{stats.pageTitle}</h2>
              <p className="profile-submissions-copy">{stats.pageCopy}</p>
            </div>
          </div>

          {mySubmissions.length === 0 ? (
            <p className="profile-empty">{stats.emptyMessage}</p>
          ) : (
            <div className="profile-table-wrap">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>ID number</th>
                    <th>File</th>
                    <th>Marks</th>
                    <th>Graded by</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {mySubmissions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.course}</td>
                      <td>{row.idNumber}</td>
                      <td>
                        <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                      </td>
                      <td>{formatMark(row.marks)}</td>
                      <td>{row.gradedBy || "—"}</td>
                      <td>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}

export default Profile;
