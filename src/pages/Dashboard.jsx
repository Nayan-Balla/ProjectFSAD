import MainLayout from "../layout/MainLayout";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { useSubmissions } from "../context/SubmissionsContext";
import { hasAssignedMark } from "../utils/submissions";

const MARK_RANGES = [
  { name: "90 & above", min: 90, max: 100, fill: "#059669" },
  { name: "80-89", min: 80, max: 89, fill: "#0d9488" },
  { name: "70-79", min: 70, max: 79, fill: "#0891b2" },
  { name: "60-69", min: 60, max: 69, fill: "#6366f1" },
  { name: "50-59", min: 50, max: 59, fill: "#8b5cf6" },
  { name: "40-49", min: 40, max: 49, fill: "#d97706" },
  { name: "30-39", min: 30, max: 39, fill: "#ea580c" },
  { name: "Below 30", min: 0, max: 29, fill: "#dc2626" },
];

function getMarkRangesData(submissions) {
  const withMarks = submissions.filter((s) => hasAssignedMark(s.marks));
  const countByRange = MARK_RANGES.map((r) => ({ ...r, value: 0 }));

  withMarks.forEach((s) => {
    const num = parseFloat(String(s.marks).replace(/[^\d.]/g, ""), 10);
    if (Number.isNaN(num)) return;
    const range = MARK_RANGES.find((r) => num >= r.min && num <= r.max);
    if (range) {
      const entry = countByRange.find((e) => e.name === range.name);
      if (entry) entry.value += 1;
    }
  });

  return countByRange;
}

function Dashboard() {
  const { submissions } = useSubmissions();
  const totalSubmissions = submissions.length;
  const withMarks = submissions.filter((s) => hasAssignedMark(s.marks)).length;
  const notMarked = totalSubmissions - withMarks;

  const pieData = useMemo(() => getMarkRangesData(submissions), [submissions]);
  const hasAnyMarks = pieData.some((d) => d.value > 0);
  const chartData = hasAnyMarks
    ? pieData.map((d) => ({ ...d, value: d.value || 0.001 }))
    : [{ name: "No graded submissions", value: 1, fill: "#e2e8f0" }];

  const markedVsNotBarData = useMemo(() => [
    { name: "Marked", count: withMarks, fill: "#059669" },
    { name: "Not marked", count: notMarked, fill: "#d97706" },
  ], [withMarks, notMarked]);

  return (
    <MainLayout>
      <div className="dashboard-page">
        <h1 className="page-title">Learning outcomes dashboard</h1>
        <p className="page-subtitle">
          Track assessment data and analyze learning outcomes. Overview of submissions, marks distribution, and performance metrics.
        </p>

        <div className="dashboard-summary">
          <div className="dashboard-summary__item">
            <span className="dashboard-summary__value">{totalSubmissions}</span>
            <span className="dashboard-summary__label">Total submissions</span>
          </div>
          <div className="dashboard-summary__item dashboard-summary__item--marked">
            <span className="dashboard-summary__value">{withMarks}</span>
            <span className="dashboard-summary__label">Marked</span>
          </div>
          <div className="dashboard-summary__item dashboard-summary__item--pending">
            <span className="dashboard-summary__value">{notMarked}</span>
            <span className="dashboard-summary__label">Not marked</span>
          </div>
        </div>

        <div className="dashboard-card chart-card">
          <h2>Marked vs Not marked</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={markedVsNotBarData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: "#475569" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#475569" }} />
              <Tooltip formatter={(value) => [value, "Submissions"]} />
              <Legend />
              <Bar dataKey="count" name="Submissions" fill="#059669" radius={[4, 4, 0, 0]}>
                {markedVsNotBarData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card chart-card">
          <h2>Marks distribution (90 & above, 80-89, 70-79, 60-69, 50-59, 40-49, 30-39, Below 30)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, value }) => `${name}: ${value < 1 ? 0 : value}`}
                labelLine
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value < 1 ? Math.round(value) : value, "Count"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="dashboard-ranges-list">
            <p className="dashboard-ranges-list__title">All mark ranges (including 60-69, 50-59):</p>
            <ul className="dashboard-ranges-list__items">
              {pieData.map((r) => (
                <li key={r.name} style={{ borderLeftColor: r.fill }}>
                  <span>{r.name}</span>
                  <strong>{r.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Dashboard;
