import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { useSubmissions } from "../context/SubmissionsContext";
import { useAuth } from "../context/AuthContext";
import { BTECH_COURSES } from "../constants/btechCourses";
import { hasAssignedMark } from "../utils/submissions";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDurationWeeks(firstTs, lastTs) {
  if (!firstTs || !lastTs || lastTs <= firstTs) return null;
  const weeks = Math.max(1, Math.round((lastTs - firstTs) / (7 * 24 * 60 * 60 * 1000)));
  return weeks;
}

function getCourseColor(code) {
  const n = (code || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [210, 260, 160, 30, 340];
  return `hsl(${hues[n % hues.length]}, 55%, 42%)`;
}

function Courses() {
  const { submissions } = useSubmissions();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("in-progress");
  const [learningDays, setLearningDays] = useState([1, 1, 1, 1, 1, 0, 0]); // M–S active

  const { inProgressCourses, completedCourses } = useMemo(() => {
    const mine = submissions.filter(
      (s) => s.studentEmail && user?.email && s.studentEmail === user.email
    );
    const byCourse = {};
    mine.forEach((s) => {
      const name = s.course || "Unnamed course";
      if (!byCourse[name]) byCourse[name] = { submissions: [], name };
      byCourse[name].submissions.push(s);
    });
    const registered = Object.values(byCourse).map(({ name, submissions: subs }) => {
      const sorted = [...subs].sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));
      const firstTs = sorted[0]?.submittedAt;
      const lastTs = sorted[sorted.length - 1]?.submittedAt;
      const graded = subs.filter((s) => hasAssignedMark(s.marks)).length;
      const total = subs.length;
      const progress = total > 0 ? Math.round((graded / total) * 100) : 0;
      const weeks = getDurationWeeks(firstTs, lastTs);
      const duration = weeks ? `${weeks} week${weeks !== 1 ? "s" : ""}` : "Ongoing";
      return {
        name,
        started: firstTs,
        duration,
        total,
        graded,
        progress,
        completed: progress === 100,
      };
    });
    registered.sort((a, b) => (b.started || 0) - (a.started || 0));
    const completed = registered.filter((c) => c.completed);
    const inProgress = registered.filter((c) => !c.completed);
    return { inProgressCourses: inProgress, completedCourses: completed };
  }, [submissions, user]);

  const isStudent = user?.role === "Student";

  const filterBySearch = useCallback((list, getLabel) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((item) => getLabel(item).toLowerCase().includes(q));
  }, [searchQuery]);

  const savedCourses = useMemo(
    () =>
      filterBySearch(BTECH_COURSES, (c) => `${c.code} ${c.name}`),
    [filterBySearch]
  );
  const inProgressFiltered = useMemo(
    () => filterBySearch(inProgressCourses, (c) => c.name),
    [filterBySearch, inProgressCourses]
  );
  const completedFiltered = useMemo(
    () => filterBySearch(completedCourses, (c) => c.name),
    [filterBySearch, completedCourses]
  );

  const toggleLearningDay = (i) => {
    setLearningDays((prev) => {
      const next = [...prev];
      next[i] = next[i] ? 0 : 1;
      return next;
    });
  };

  return (
    <MainLayout>
      <div className="my-learning">
        <header className="my-learning-header">
          <h1 className="my-learning-title">My Learning</h1>
          <p className="my-learning-subtitle">
            {isStudent ? "Your courses, progress, and schedule." : "Course catalog and teaching schedule."}
          </p>
          <div className="my-learning-search-wrap">
            <span className="my-learning-search-icon" aria-hidden>⌕</span>
            <input
              type="search"
              className="my-learning-search"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search courses"
            />
          </div>
        </header>

        <div className="my-learning-body">
          <aside className="my-learning-sidebar">
            <div className="my-learning-plan-card">
              <h2 className="my-learning-plan-title">Learning plan</h2>
              <div className="my-learning-plan-days">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`my-learning-plan-day ${learningDays[i] ? "my-learning-plan-day--active" : ""}`}
                    onClick={() => toggleLearningDay(i)}
                    title={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}
                    aria-pressed={!!learningDays[i]}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <a href="#" className="my-learning-plan-link" onClick={(e) => e.preventDefault()}>Set your learning plan</a>
            </div>
          </aside>

          <main className="my-learning-main">
            <div className="my-learning-tabs">
              <button
                type="button"
                className={`my-learning-tab ${activeTab === "in-progress" ? "my-learning-tab--active" : ""}`}
                onClick={() => setActiveTab("in-progress")}
              >
                In Progress
              </button>
              <button
                type="button"
                className={`my-learning-tab ${activeTab === "saved" ? "my-learning-tab--active" : ""}`}
                onClick={() => setActiveTab("saved")}
              >
                Saved
              </button>
              <button
                type="button"
                className={`my-learning-tab ${activeTab === "completed" ? "my-learning-tab--active" : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                Completed
              </button>
            </div>

            <div className="my-learning-list">
              {activeTab === "in-progress" && (
                <>
                  {!isStudent ? (
                    <p className="my-learning-empty">As faculty, you don’t have course progress here. Use the <strong>Saved</strong> tab to view the course schedule.</p>
                  ) : inProgressFiltered.length === 0 ? (
                    <p className="my-learning-empty">No courses in progress. Submit assignments from <Link to="/add-submission">Add submission</Link> to see your courses here.</p>
                  ) : (
                    inProgressFiltered.map((course) => (
                      <article key={course.name} className="my-learning-card">
                        <div className="my-learning-card__thumb" style={{ background: `linear-gradient(135deg, ${getCourseColor(course.name)}, #1e3a5f)` }} />
                        <div className="my-learning-card__content">
                          <span className="my-learning-card__status">Started</span>
                          <h3 className="my-learning-card__name">{course.name}</h3>
                          <p className="my-learning-card__desc">
                            {course.graded} of {course.total} assignments graded. Keep submitting to complete your learning path.
                          </p>
                          <div className="my-learning-card__progress-wrap">
                            <span className="my-learning-card__progress-label">Progress: {course.progress}%</span>
                            <div className="my-learning-card__progress-bar">
                              <div className="my-learning-card__progress-fill" style={{ width: `${course.progress}%` }} />
                            </div>
                          </div>
                          <p className="my-learning-card__meta">{course.total - course.graded} assignment{course.total - course.graded !== 1 ? "s" : ""} pending</p>
                          <Link to="/add-submission" className="my-learning-card__btn">Resume</Link>
                        </div>
                      </article>
                    ))
                  )}
                </>
              )}

              {activeTab === "saved" && (
                <>
                  {savedCourses.length === 0 ? (
                    <p className="my-learning-empty">No courses match your search.</p>
                  ) : (
                    savedCourses.map((c) => (
                      <article key={c.code} className="my-learning-card my-learning-card--saved">
                        <div className="my-learning-card__thumb" style={{ background: `linear-gradient(135deg, ${getCourseColor(c.code)}, #1e3a5f)` }}>
                          <span className="my-learning-card__code">{c.code}</span>
                        </div>
                        <div className="my-learning-card__content">
                          <h3 className="my-learning-card__name">{c.name}</h3>
                          <p className="my-learning-card__desc">{c.description}</p>
                          <p className="my-learning-card__schedule">{c.day} · {c.time} · {c.duration}</p>
                          <span className="my-learning-card__badge">Semester {c.semester} · {c.credits} credits</span>
                        </div>
                      </article>
                    ))
                  )}
                </>
              )}

              {activeTab === "completed" && (
                <>
                  {!isStudent ? (
                    <p className="my-learning-empty">Completed courses are shown for students only.</p>
                  ) : completedFiltered.length === 0 ? (
                    <p className="my-learning-empty">No completed courses yet. Complete and get feedback on all assignments in a course to see it here.</p>
                  ) : (
                    completedFiltered.map((course) => (
                      <article key={course.name} className="my-learning-card my-learning-card--completed">
                        <div className="my-learning-card__thumb" style={{ background: "linear-gradient(135deg, #059669, #047857)" }} />
                        <div className="my-learning-card__content">
                          <span className="my-learning-card__status my-learning-card__status--done">Completed</span>
                          <h3 className="my-learning-card__name">{course.name}</h3>
                          <p className="my-learning-card__desc">
                            All {course.total} assignments graded. Learning path complete.
                          </p>
                          <div className="my-learning-card__progress-wrap">
                            <span className="my-learning-card__progress-label">Progress: 100%</span>
                            <div className="my-learning-card__progress-bar">
                              <div className="my-learning-card__progress-fill" style={{ width: "100%" }} />
                            </div>
                          </div>
                          <p className="my-learning-card__meta">Ended {formatDate(course.started)}</p>
                          <Link to="/my-outcomes" className="my-learning-card__btn">View outcomes</Link>
                        </div>
                      </article>
                    ))
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </MainLayout>
  );
}

export default Courses;
