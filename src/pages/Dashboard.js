import { useEffect, useState } from "react";
import API from "../api/api";
import AddSchoolModal from "../components/AddSchoolModal";
import SchoolDropdown from "../components/SchoolDropdown";
import StudentTable from "../components/StudentTable";
import Popup from "../components/Popup";

export default function Dashboard() {
  // State variables
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) fetchStudents(selectedSchool);
  }, [selectedSchool]);

  const fetchSchools = async () => {
    const res = await API.get("/school");
    setSchools(res.data);
    if (res.data.length > 0) setSelectedSchool(res.data[0]._id);
  };

  const fetchStudents = async (schoolId) => {
    const res = await API.get(`/school/${schoolId}/students`);
    setStudents(res.data);
  };

  const handleAddSchool = () => setShowModal(true);

  const handleSchoolAdded = (newSchool) => {
    setShowModal(false);
    setPopup({ show: true, message: "School added successfully!", type: "success" });
    if (newSchool?._id) {
      // Optimistically add and select the new school
      setSchools(prev => [newSchool, ...prev]);
      setSelectedSchool(newSchool._id);
      fetchStudents(newSchool._id);
    } else {
      fetchSchools();
    }
  };

  const handleSchoolDeleted = (deletedSchoolId) => {
    setSchools(schools.filter(school => school._id !== deletedSchoolId));
    if (selectedSchool === deletedSchoolId) {
      setSelectedSchool("");
      setStudents([]);
    }
    if (schools.length > 1) {
      const remainingSchools = schools.filter(school => school._id !== deletedSchoolId);
      if (remainingSchools.length > 0) {
        setSelectedSchool(remainingSchools[0]._id);
      }
    }
    setPopup({ show: true, message: "School deleted successfully!", type: "success" });
  };

  const handleVerifyResult = (result, message) => {
    setPopup({ show: true, message, type: result });
    // Refresh the student list to show updated status
    if (selectedSchool) {
      fetchStudents(selectedSchool);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await API.get(`/school/${selectedSchool}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "all_profiles.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setPopup({ show: true, message: "Download failed", type: "error" });
    }
  };

  const handleDownloadVerifiedOnly = async () => {
    try {
      const res = await API.get(`/school/${selectedSchool}/download/verified-only`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "verified_profiles_only.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPopup({ show: true, message: "Verified profiles downloaded successfully!", type: "success" });
    } catch (err) {
      const errorMessage = err.response?.status === 404 ? "No verified students found for this school" : "Download failed";
      setPopup({ show: true, message: errorMessage, type: "error" });
    }
  };

  const handleDownloadAllVerified = async () => {
    try {
      const res = await API.get(`/school/download/all-verified`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "all_verified_profiles.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPopup({ show: true, message: "All verified profiles downloaded successfully!", type: "success" });
    } catch (err) {
      const errorMessage = err.response?.status === 404 ? "No verified students found across all schools" : "Download failed";
      setPopup({ show: true, message: errorMessage, type: "error" });
    }
  };

  const handleRegenerateDescriptors = async () => {
    if (!selectedSchool) {
      setPopup({ show: true, message: "Please select a school first", type: "error" });
      return;
    }

    try {
      setPopup({ show: true, message: "Regenerating face descriptors...", type: "info" });
      const res = await API.post(`/school/${selectedSchool}/regenerate-descriptors`);
      setPopup({ 
        show: true, 
        message: `Successfully regenerated ${res.data.descriptorsCount} face descriptors!`, 
        type: "success" 
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to regenerate descriptors";
      setPopup({ show: true, message: errorMessage, type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Face Verification App</h1>
        <button
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleAddSchool}
        >
          Add School
        </button>
      </div>
      
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <SchoolDropdown
            schools={schools}
            selected={selectedSchool}
            onChange={setSelectedSchool}
            onSchoolDeleted={handleSchoolDeleted}
          />
          <button
            className="w-full sm:w-auto bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            onClick={handleRegenerateDescriptors}
          >
            Regenerate Face Descriptors
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
            onClick={handleDownload}
            title="Download all profiles for current school"
          >
            Download All Profiles
          </button>
          <button
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            onClick={handleDownloadVerifiedOnly}
            title="Download only verified profiles for current school"
          >
            Download Verified Only
          </button>
          <button
            className="w-full sm:w-auto bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm"
            onClick={handleDownloadAllVerified}
            title="Download verified profiles from all schools"
          >
            Download All Schools Verified
          </button>
        </div>
      </div>
      
      <StudentTable
        students={students}
        schoolId={selectedSchool}
        onVerifyResult={handleVerifyResult}
      />
      {showModal && (
        <AddSchoolModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSchoolAdded}
        />
      )}
      <Popup
        show={popup.show}
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ ...popup, show: false })}
      />
    </div>
  );
}