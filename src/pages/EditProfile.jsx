import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile as updateProfileApi } from "../api/api";
import { DEPARTMENTS } from "../constants/departments";
import MainLayout from "../layout/MainLayout";
import "../assets/styles/auth.css";

function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [experience, setExperience] = useState(user?.experience || 0);
  const [photo, setPhoto] = useState(user?.photo || "");
  const [photoPreview, setPhotoPreview] = useState(user?.photo || "");
  const [removedPhoto, setRemovedPhoto] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === "string" ? reader.result : "";
      setPhoto(base64);
      setPhotoPreview(base64);
      setRemovedPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = () => {
    setPhoto("");
    setPhotoPreview("");
    setRemovedPhoto(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!user?.id) {
      setError("You must be logged in to update your profile.");
      return;
    }

    const updates = {
      name: name.trim(),
      department: department.trim(),
      experience: Number.isFinite(Number(experience)) ? Number(experience) : 0,
    };
    if (removedPhoto || photo) {
      updates.photo = photo;
    }

    updateProfileApi(user.id, updates)
      .then((updatedUser) => {
        updateProfile(updatedUser);
        setSuccess("Profile updated successfully.");
        setTimeout(() => navigate("/profile"), 800);
      })
      .catch((err) => {
        setError(err.message || "Update failed. Please try again.");
      });
  };

  return (
    <MainLayout>
      <div className="profile-edit-page">
        <h1 className="page-title">Edit Profile</h1>
        <p className="page-subtitle">Update your name and department. Your email and role are fixed.</p>

        <div className="auth-box profile-edit-box">
          {error && <div className="form-message form-message--error">{error}</div>}
          {success && <div className="form-message form-message--success">{success}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {user?.role === "Admin" || user?.role === "Faculty" ? (
              <div className="form-group">
                <label htmlFor="profile-experience">Experience (years)</label>
                <input
                  id="profile-experience"
                  type="number"
                  min="0"
                  max="50"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
            ) : null}
            <div className="form-group">
              <label htmlFor="profile-photo">Profile photo</label>
              <input
                id="profile-photo"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handlePhotoChange}
                className="input-file"
              />
              {photoPreview && (
                <div className="profile-photo-preview">
                  <img src={photoPreview} alt="Profile preview" />
                  <button
                    type="button"
                    className="profile-photo-delete"
                    onClick={handlePhotoRemove}
                  >
                    🗑️ Remove
                  </button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="profile-department">Department</label>
              <select
                id="profile-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={user?.email || ""} disabled />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input type="text" value={user?.role || ""} disabled />
            </div>
            <button type="submit" className="button-primary">Save profile</button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

export default EditProfile;
