import { useState } from "react";
import API from "../api/api";

export default function DeleteSchoolModal({ school, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/school/${school._id}`);
      onDeleted(school._id);
      onClose();
    } catch (err) {
      alert('Failed to delete school');
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4 text-red-600">Delete School</h2>
        <p className="mb-4">
          Are you sure you want to delete <strong>{school?.name}</strong>?
        </p>
        <p className="mb-4 text-sm text-gray-600">
          This will permanently delete the school and all its students. This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete School"}
          </button>
        </div>
      </div>
    </div>
  );
}