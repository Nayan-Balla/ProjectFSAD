import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getSubmissions, submitAssignment, updateSubmissionMarks, deleteSubmission as deleteSubmissionApi } from "../api/api";
import { useAuth } from "./AuthContext";
import { hasAssignedMark } from "../utils/submissions";

const SubmissionsContext = createContext(null);

export function SubmissionsProvider({ children }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshSubmissions = useCallback(async () => {
    if (!user?.token) {
      setSubmissions([]);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await getSubmissions();
      setSubmissions(data);
    } catch (err) {
      setError(err.message || "Failed to load submissions.");
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  const addSubmission = useCallback(
    async (payload) => {
      const created = await submitAssignment(payload);
      setSubmissions((prev) => [created, ...prev]);
      return created.id;
    },
    []
  );

  const updateMarks = useCallback(
    async (id, marks, gradedBy = "") => {
      let snapshot;
      setSubmissions((prev) => {
        snapshot = prev.find((s) => s.id === id);
        return prev.map((item) =>
          item.id === id
            ? {
                ...item,
                marks,
                gradedBy: hasAssignedMark(marks) ? gradedBy : "",
                markedAt: hasAssignedMark(marks) ? new Date().toISOString() : null,
              }
            : item
        );
      });

      if (snapshot) {
        try {
          const updated = await updateSubmissionMarks(snapshot, marks, gradedBy);
          setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
          return updated;
        } catch (err) {
          setError(err.message || "Failed to save marks to server.");
          throw err;
        }
      }

      return null;
    },
    []
  );

  const deleteSubmission = useCallback(async (id) => {
    setSubmissions((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteSubmissionApi(id);
    } catch (err) {
      setError(err.message || "Failed to delete submission on server.");
    }
  }, []);

  return (
    <SubmissionsContext.Provider
      value={{ submissions, isLoading, error, refreshSubmissions, addSubmission, updateMarks, deleteSubmission }}
    >
      {children}
    </SubmissionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubmissions() {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) throw new Error("useSubmissions must be used within SubmissionsProvider");
  return ctx;
}
