import { useMemo } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useAuth } from "../context/AuthContext";
import FileViewDownload from "../components/FileViewDownload";
import { formatMark, hasAssignedMark } from "../utils/submissions";

const LOW_MARK_THRESHOLD = 40;

function MyLearningOutcomes() {
  const { submissions } = useSubmissions();
  const { user } = useAuth();

  const mySubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) => submission.studentEmail && user?.email && submission.studentEmail === user.email
      ),
    [submissions, user]
  );

  const { graded, pending, needImprovement } = useMemo(() => {
    const gradedRows = mySubmissions.filter((submission) => hasAssignedMark(submission.marks));
    const pendingRows = mySubmissions.filter((submission) => !hasAssignedMark(submission.marks));
    const withNumericMarks = gradedRows.filter((submission) => {
      const num = parseFloat(String(submission.marks).replace(/[^\d.]/g, ""), 10);
      return !Number.isNaN(num);
    });
    const lowMarks = withNumericMarks.filter(
      (submission) => parseFloat(String(submission.marks).replace(/[^\d.]/g, ""), 10) < LOW_MARK_THRESHOLD
    );
    return { graded: gradedRows, pending: pendingRows, needImprovement: lowMarks };
  }, [mySubmissions]);

  return (
    <MainLayout>
      <div className="outcomes-page">
        <h1 className="page-title">My learning outcomes</h1>
        <p className="page-subtitle">
          View your learning outcomes, monitor progress, and identify areas for improvement.
        </p>

        <section className="outcomes-section outcomes-summary">
          <h2 className="outcomes-section__title">Monitor progress</h2>
          <div className="outcomes-summary__grid">
            <div className="outcomes-summary__card">
              <span className="outcomes-summary__value">{mySubmissions.length}</span>
              <span className="outcomes-summary__label">Total submitted</span>
            </div>
            <div className="outcomes-summary__card outcomes-summary__card--success">
              <span className="outcomes-summary__value">{graded.length}</span>
              <span className="outcomes-summary__label">Graded (with outcome)</span>
            </div>
            <div className="outcomes-summary__card outcomes-summary__card--pending">
              <span className="outcomes-summary__value">{pending.length}</span>
              <span className="outcomes-summary__label">Pending feedback</span>
            </div>
          </div>
        </section>

        {needImprovement.length > 0 && (
          <section className="outcomes-section outcomes-improve">
            <h2 className="outcomes-section__title">Identify areas for improvement</h2>
            <p className="outcomes-section__desc">
              Submissions with marks below {LOW_MARK_THRESHOLD}. Consider reviewing feedback and improving in these areas.
            </p>
            <ul className="outcomes-improve__list">
              {needImprovement.map((submission) => (
                <li key={submission.id} className="outcomes-improve__item">
                  <strong>{submission.course}</strong> - {submission.fileName || "Submission"} (Marks: {submission.marks})
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="outcomes-section">
          <h2 className="outcomes-section__title">View learning outcomes</h2>
          <p className="outcomes-section__desc">
            All your assessment data: course, file, marks, and who graded each submission.
          </p>
          {mySubmissions.length === 0 ? (
            <p className="outcomes-empty">
              No submissions yet. <Link to="/add-submission">Submit an assignment</Link> to see your learning outcomes here.
            </p>
          ) : (
            <div className="outcomes-table-wrap">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>File</th>
                    <th>Marks (outcome)</th>
                    <th>Graded by</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mySubmissions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.course}</td>
                      <td>
                        <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                      </td>
                      <td><strong>{formatMark(row.marks)}</strong></td>
                      <td>{row.gradedBy || "—"}</td>
                      <td>
                        <Link to="/add-submission" className="outcomes-link">
                          View / Delete
                        </Link>
                      </td>
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

export default MyLearningOutcomes;
