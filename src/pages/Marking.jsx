import { useState, useMemo, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useAuth } from "../context/AuthContext";
import FileViewDownload from "../components/FileViewDownload";

function isToday(timestamp) {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function Marking() {
  const { submissions, updateMarks, isLoading, error } = useSubmissions();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedIdNumber, setSelectedIdNumber] = useState(null);

  const graderLabel = user?.name || user?.email || "Faculty";

  const visibleSubmissions = useMemo(() => submissions, [submissions]);

  const courseOptions = useMemo(() => {
    const courseSet = new Set();
    visibleSubmissions.forEach((s) => {
      if (s.course) courseSet.add(s.course);
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
    return visibleSubmissions.filter((s) => s.course === selectedCourse);
  }, [visibleSubmissions, selectedCourse]);

  const todaySubmissions = useMemo(
    () => courseFilteredSubmissions.filter((s) => isToday(s.submittedAt)),
    [courseFilteredSubmissions]
  );

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return courseFilteredSubmissions;
    const q = searchQuery.trim().toLowerCase();
    return courseFilteredSubmissions.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.idNumber && String(s.idNumber).toLowerCase().includes(q))
    );
  }, [courseFilteredSubmissions, searchQuery]);

  const selectedStudentSubmissions = useMemo(() => {
    if (!selectedIdNumber) return [];
    return courseFilteredSubmissions.filter((s) => s.idNumber === selectedIdNumber);
  }, [courseFilteredSubmissions, selectedIdNumber]);

  const selectedStudentName = selectedStudentSubmissions[0]?.name || selectedIdNumber;

  return (
    <MainLayout>
      <div className="marking-page">
        <h1 className="page-title">Track assessment data</h1>
        <p className="page-subtitle">
          View all student submissions, enter or update marks, and analyze learning outcomes. Your name is recorded as the grader.
        </p>
        <p className="page-subtitle">
          Submissions and marks are saved to the Spring Boot backend. Make sure the backend is running at http://localhost:2020.
        </p>
        {error && <p className="dashboard-empty">{error}</p>}

        <section className="marking-today">
          <h2 className="marking-today__title">Today&apos;s submitted files</h2>
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
                      <td>{row.marks || "-"}</td>
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
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="marks-input"
                      placeholder="Enter marks"
                      value={row.marks ?? ""}
                      onChange={(e) => updateMarks(row.id, e.target.value, graderLabel)}
                    />
                  </td>
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
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="marks-input"
                        placeholder="Enter marks"
                        value={row.marks ?? ""}
                        onChange={(e) => updateMarks(row.id, e.target.value, graderLabel)}
                      />
                    </td>
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
