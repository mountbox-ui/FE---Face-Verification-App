import { useState } from "react";
import API from "../api/api";

export default function AddSchoolModal({ onClose, onSuccess }) {
  const [xlsFile, setXlsFile] = useState(null);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!xlsFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("xlsFile", xlsFile);
    if (groupPhoto) formData.append("groupPhoto", groupPhoto);

    try {
      const res = await API.post("/school/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLoading(false);
      onSuccess(res.data?.school);
    } catch (err) {
      setLoading(false);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message || 'Failed to add school';
      alert(`Failed to add school (${status || 'network'}): ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <form className="bg-white p-4 sm:p-6 rounded shadow-md w-full max-w-sm sm:max-w-md" onSubmit={handleSubmit}>
        <h2 className="text-lg sm:text-xl font-bold mb-4">Add School</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Excel File (Required)</label>
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={e => setXlsFile(e.target.files[0])}
            className="w-full text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Group Photo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setGroupPhoto(e.target.files[0])}
            className="w-full text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2 rounded bg-gray-300 text-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded bg-blue-500 text-white text-sm"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}