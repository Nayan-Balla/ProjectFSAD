import { useState } from "react";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useAuth } from "../context/AuthContext";
import FileViewDownload from "../components/FileViewDownload";
import "../assets/styles/auth.css";
import { formatMark } from "../utils/submissions";

function AddSubmission() {
  const { addSubmission, submissions, deleteSubmission, refreshSubmissions, isLoading, error } = useSubmissions();
  const { user } = useAuth();
  const [course, setCourse] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedUserEmail = (user?.email || "").trim().toLowerCase();
  const normalizedUserName = (user?.name || "").trim().toLowerCase();

  const mySubmissions = submissions.filter((submission) => {
    const submissionEmail = (submission.studentEmail || "").trim().toLowerCase();
    const submissionName = (submission.name || submission.studentName || "").trim().toLowerCase();

    if (submissionEmail && normalizedUserEmail) {
      return submissionEmail === normalizedUserEmail;
    }

    if (!submissionEmail && submissionName && normalizedUserName) {
      return submissionName === normalizedUserName;
    }

    return false;
  });

  const resetForm = () => {
    setCourse("");
    setIdNumber("");
    setName(user?.name || "");
    setFile(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this submission? It will be removed from the database too.")) {
      await deleteSubmission(id);
      await refreshSubmissions();
    }
  };

  const persistSubmission = async (fileData = null) => {
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitted(false);

    try {
      await addSubmission({
        course: course.trim(),
        idNumber: idNumber.trim(),
        name: name.trim(),
        fileName: file ? file.name : "",
        studentEmail: user?.email || "",
        department: user?.department || "",
        fileData,
      });
      await refreshSubmissions();
      resetForm();
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      await persistSubmission(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = typeof reader.result === "string" ? reader.result : null;
      await persistSubmission(base64);
    };
    reader.onerror = () => {
      setSubmitError("Failed to read the selected file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <MainLayout>
      <div className="student-page">
        <div className="student-page__form-wrap">
          <div className="auth-box submission-box">
            <h2>Submit assignment</h2>
            <p className="auth-desc">Submit your assignment with course name, student ID, your name, and supporting file (PDF, Word, or text).</p>

            {submitted && (
              <div className="form-message form-message--success">
                Submission added successfully.
              </div>
            )}
            {submitError && <div className="form-message">{submitError}</div>}
            {error && <div className="form-message">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="sub-course">Course</label>
                <input
                  id="sub-course"
                  type="text"
                  placeholder="Enter course name"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sub-id">ID number</label>
                <input
                  id="sub-id"
                  type="text"
                  placeholder="e.g. 2400090250"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sub-name">Name</label>
                <input
                  id="sub-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sub-file">Upload file or image</label>
                <input
                  id="sub-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.bmp,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="input-file"
                />
                {file && <span className="file-name">{file.name}</span>}
              </div>
              <button type="submit" className="button-primary" disabled={isSubmitting || isLoading}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>
        </div>

        <section className="my-submissions">
          <h2 className="my-submissions__title">My submissions</h2>
          <p className="my-submissions__desc">Your submitted assignments. Use <strong>View</strong> to open the submitted PDF/file in the browser and <strong>Download</strong> to save it. Marks and the faculty who graded each submission appear once assigned.</p>
          {isLoading ? (
            <p className="my-submissions__empty">Loading submissions...</p>
          ) : mySubmissions.length === 0 ? (
            <p className="my-submissions__empty">No submissions yet. Submit an assignment above.</p>
          ) : (
            <div className="my-submissions__table-wrap">
              <table className="edu-table my-submissions__table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>ID number</th>
                    <th>Name</th>
                    <th>File</th>
                    <th>Marks</th>
                    <th>Graded by</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mySubmissions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.course}</td>
                      <td>{row.idNumber}</td>
                      <td>{row.name}</td>
                      <td>
                        <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                      </td>
                      <td><strong>{formatMark(row.marks)}</strong></td>
                      <td>{row.gradedBy || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="my-submissions__delete-btn"
                          onClick={() => handleDelete(row.id)}
                          title="Hide this submission"
                        >
                          Delete
                        </button>
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

export default AddSubmission;
