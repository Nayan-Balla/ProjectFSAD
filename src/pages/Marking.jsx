import { useState, useMemo, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useAuth } from "../context/AuthContext";
import FileViewDownload from "../components/FileViewDownload";
import { formatMark } from "../utils/submissions";

function isToday(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function Marking() {
  const { submissions, updateMarks, isLoading, error } = useSubmissions();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedIdNumber, setSelectedIdNumber] = useState(null);
  const [markDrafts, setMarkDrafts] = useState({});
  const [savingMarks, setSavingMarks] = useState({});

  const graderLabel = user?.name || user?.email || "Faculty";
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:2121";

  const visibleSubmissions = useMemo(() => submissions, [submissions]);

  const courseOptions = useMemo(() => {
    const courseSet = new Set();
    visibleSubmissions.forEach((submission) => {
      if (submission.course) courseSet.add(submission.course);
    });
    return Array.from(courseSet).sort();
  }, [visibleSubmissions]);

  useEffect(() => {
    if (selectedCourse && !courseOptions.includes(selectedCourse)) {
      setSelectedCourse("");
    }
  }, [courseOptions, selectedCourse]);

  const courseFilteredSubmissions = useMemo(() => {
    if (!selectedCourse) return visibleSubmissions;
    return visibleSubmissions.filter((submission) => submission.course === selectedCourse);
  }, [visibleSubmissions, selectedCourse]);

  const todaySubmissions = useMemo(
    () => courseFilteredSubmissions.filter((submission) => isToday(submission.submittedAt)),
    [courseFilteredSubmissions]
  );

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return courseFilteredSubmissions;
    const query = searchQuery.trim().toLowerCase();
    return courseFilteredSubmissions.filter(
      (submission) =>
        (submission.name && submission.name.toLowerCase().includes(query)) ||
        (submission.idNumber && String(submission.idNumber).toLowerCase().includes(query))
    );
  }, [courseFilteredSubmissions, searchQuery]);

  const selectedStudentSubmissions = useMemo(() => {
    if (!selectedIdNumber) return [];
    return courseFilteredSubmissions.filter((submission) => submission.idNumber === selectedIdNumber);
  }, [courseFilteredSubmissions, selectedIdNumber]);

  const selectedStudentName = selectedStudentSubmissions[0]?.name || selectedIdNumber;

  const getMarkInputValue = (row) => {
    const draft = markDrafts[row.id];
    if (draft !== undefined) return draft;
    return row.marks ?? "";
  };

  const handleMarkChange = (id, value) => {
    const sanitized = value.replace(/[^\d]/g, "").slice(0, 3);
    setMarkDrafts((prev) => ({ ...prev, [id]: sanitized }));
  };

  const saveMark = async (row) => {
    const rawValue = markDrafts[row.id];
    if (rawValue === undefined) return;

    const trimmed = String(rawValue).trim();
    if (trimmed === "") return;

    const numeric = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(numeric)) return;

    const bounded = Math.max(0, Math.min(100, numeric));
    setSavingMarks((prev) => ({ ...prev, [row.id]: true }));

    try {
      await updateMarks(row.id, bounded, graderLabel);
      setMarkDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } finally {
      setSavingMarks((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    }
  };

  const handleMarkKeyDown = async (event, row) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await saveMark(row);
    }
  };

  const renderMarksInput = (row) => (
    <input
      type="number"
      min="0"
      max="100"
      className="marks-input"
      placeholder="Enter marks"
      value={getMarkInputValue(row)}
      onChange={(event) => handleMarkChange(row.id, event.target.value)}
      onBlur={() => saveMark(row)}
      onKeyDown={(event) => handleMarkKeyDown(event, row)}
      disabled={Boolean(savingMarks[row.id])}
    />
  );

  return (
    <MainLayout>
      <div className="marking-page">
        <h1 className="page-title">Track assessment data</h1>
        <p className="page-subtitle">
          View all student submissions, enter or update marks, and analyze learning outcomes. Your name is recorded as the grader.
        </p>
        <p className="page-subtitle">
          Submissions and marks are saved to the Spring Boot backend. Make sure the backend is running at {apiBaseUrl}.
        </p>
        {error && <p className="dashboard-empty">{error}</p>}

        <section className="marking-today">
          <h2 className="marking-today__title">Today's submitted files</h2>
          {isLoading ? (
            <p className="marking-today__empty">Loading submissions...</p>
          ) : todaySubmissions.length === 0 ? (
            <p className="marking-today__empty">No submissions today yet.</p>
          ) : (
            <div className="marking-today__table-wrap">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>ID number</th>
                    <th>Name</th>
                    <th>Course</th>
                    <th>File</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySubmissions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.idNumber}</td>
                      <td>{row.name}</td>
                      <td>{row.course}</td>
                      <td>
                        <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                      </td>
                      <td>{formatMark(row.marks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="marking-search-wrap">
          <div className="marking-course-selector">
            <label className="marking-search-label">Select course</label>
            <div className="marking-course-chips">
              <button
                type="button"
                className={`marking-course-chip ${selectedCourse === "" ? "active" : ""}`}
                onClick={() => setSelectedCourse("")}
              >
                All courses
              </button>
              {courseOptions.map((course) => (
                <button
                  key={course}
                  type="button"
                  className={`marking-course-chip ${selectedCourse === course ? "active" : ""}`}
                  onClick={() => setSelectedCourse(course)}
                >
                  {course}
                </button>
              ))}
            </div>
          </div>

          <div className="marking-search-row">
            <div className="marking-search-field">
              <label htmlFor="marking-search" className="marking-search-label">Search by name or ID</label>
              <input
                id="marking-search"
                type="text"
                className="marking-search-input"
                placeholder="Type name or ID number..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h2>All submissions - enter marks</h2>
          <table className="edu-table">
            <thead>
              <tr>
                <th>ID number</th>
                <th>Name</th>
                <th>Course</th>
                <th>File</th>
                <th>Marks</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((row) => (
                <tr key={row.id}>
                  <td>{row.idNumber}</td>
                  <td>
                    <button
                      type="button"
                      className="marking-name-btn"
                      onClick={() => setSelectedIdNumber(row.idNumber)}
                    >
                      {row.name}
                    </button>
                  </td>
                  <td>{row.course}</td>
                  <td>
                    <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                  </td>
                  <td>{renderMarksInput(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filteredSubmissions.length === 0 && (
            <p className="dashboard-empty">
              {searchQuery.trim() ? "No submissions match your search." : "No submissions yet."}
            </p>
          )}
        </div>

        {selectedIdNumber && (
          <section className="marking-student-detail">
            <div className="marking-student-detail__head">
              <h2 className="marking-student-detail__title">All submissions for {selectedStudentName}</h2>
              <button
                type="button"
                className="marking-student-detail__close"
                onClick={() => setSelectedIdNumber(null)}
              >
                Close
              </button>
            </div>
            <div className="marking-student-detail__table-wrap">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>ID number</th>
                    <th>Name</th>
                    <th>Course</th>
                    <th>File</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudentSubmissions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.idNumber}</td>
                      <td>{row.name}</td>
                      <td>{row.course}</td>
                      <td>
                        <FileViewDownload fileData={row.fileData} fileName={row.fileName} />
                      </td>
                      <td>{renderMarksInput(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export default Marking;
