import { useEffect, useState } from "react";
import API from "../api/api";
import AddSchoolModal from "../components/AddSchoolModal";
import SchoolDropdown from "../components/SchoolDropdown";
import StudentTable from "../components/StudentTable";
import Popup from "../components/Popup";
import * as faceapi from 'face-api.js';

export default function Dashboard() {
  // State variables
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [selectedDay, setSelectedDay] = useState("day1"); // day1..day6
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) fetchStudents(selectedSchool, selectedDay);
  }, [selectedSchool, selectedDay]);

  const fetchSchools = async () => {
    const res = await API.get("/school");
    setSchools(res.data);
    if (res.data.length > 0) setSelectedSchool(res.data[0]._id);
  };

  const fetchStudents = async (schoolId, day) => {
    // Use student list endpoint with day projection
    const res = await API.get(`/student`, { params: { schoolId, day } });
    setStudents(res.data.students || res.data);
  };

  const handleAddSchool = () => setShowModal(true);

  const handleSchoolAdded = () => {
    setShowModal(false);
    fetchSchools();
    setPopup({ show: true, message: "School added successfully!", type: "success" });
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
    if (selectedSchool) fetchStudents(selectedSchool, selectedDay);
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

  const handleDownloadSelectedDay = async () => {
    try {
      const dayNumber = parseInt(selectedDay.replace('day', ''), 10);
      const res = await API.get(`/student/download/day/${dayNumber}`, {
        params: { schoolId: selectedSchool },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `day_${dayNumber}_details.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPopup({ show: true, message: `Day ${dayNumber} details downloaded!`, type: 'success' });
    } catch (err) {
      setPopup({ show: true, message: 'Day download failed', type: 'error' });
    }
  };

  const pollDescriptorsReady = async (schoolId, maxMs = 60000, intervalMs = 2000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      try {
        const r = await API.get(`/school/${schoolId}`);
        const status = r.data.groupDescriptorsStatus;
        const count = r.data.descriptorsCount || 0;
        if (status === 'ready' && count > 0) return { status, count };
        if (status === 'error') return { status: 'error', error: r.data.groupDescriptorsError };
      } catch {}
      await new Promise(res => setTimeout(res, intervalMs));
    }
    return { status: 'timeout' };
  };

  const clientSideRegenerate = async () => {
    try {
      // Fetch school to get group photo
      const r = await API.get(`/school/${selectedSchool}`);
      const groupPhoto = r.data.groupPhoto;
      if (!groupPhoto) throw new Error('No group photo available');

      // Load required models on the client
      await faceapi.loadTinyFaceDetectorModel('/models');
      await faceapi.loadFaceLandmarkTinyModel('/models');
      await faceapi.loadFaceRecognitionModel('/models');

      const img = await faceapi.fetchImage(groupPhoto);
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      if (!detections.length) throw new Error('No faces detected in group photo');

      const descriptors = detections.map(d => Array.from(d.descriptor));
      await API.post(`/school/${selectedSchool}/group-descriptors`, { descriptors });
      setRefreshKey(k => k + 1);
      setPopup({ show: true, message: `Face descriptors ready: ${descriptors.length}`, type: 'success' });
    } catch (e) {
      setPopup({ show: true, message: e.message || 'Client-side regeneration failed', type: 'error' });
    }
  };

  const handleRegenerateDescriptors = async () => {
    if (!selectedSchool) {
      setPopup({ show: true, message: "Please select a school first", type: "error" });
      return;
    }

    try {
      setPopup({ show: true, message: "Regenerating face descriptors...", type: "info" });
      await API.post(`/school/${selectedSchool}/regenerate-descriptors`);
      const result = await pollDescriptorsReady(selectedSchool);
      if (result.status === 'ready') {
        setPopup({ show: true, message: `Face descriptors ready: ${result.count}`, type: 'success' });
        setRefreshKey(k => k + 1);
      } else if (result.status === 'error') {
        setPopup({ show: true, message: `Descriptor regeneration failed on server. Trying locally...`, type: 'error' });
        await clientSideRegenerate();
      } else {
        setPopup({ show: true, message: 'Descriptor regeneration timed out on server. Trying locally...', type: 'error' });
        await clientSideRegenerate();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to regenerate descriptors";
      setPopup({ show: true, message: errorMessage, type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Face Verification App</h1>
        {selectedDay === 'day1' && (
          <button
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleAddSchool}
          >
            Add School
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <SchoolDropdown
            schools={schools}
            selected={selectedSchool}
            onChange={setSelectedSchool}
            onSchoolDeleted={handleSchoolDeleted}
          />
          <select
            className="w-full sm:w-auto border rounded px-3 py-2"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="day1">Day 1</option>
            <option value="day2">Day 2</option>
            <option value="day3">Day 3</option>
            <option value="day4">Day 4</option>
            <option value="day5">Day 5</option>
            <option value="day6">Day 6</option>
          </select>
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
          <button
            className="w-full sm:w-auto bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 text-sm"
            onClick={handleDownloadSelectedDay}
            title="Download details for selected day"
          >
            Download Selected Day
          </button>
        </div>
      </div>
      
      <StudentTable
        students={students}
        schoolId={selectedSchool}
        onVerifyResult={handleVerifyResult}
        selectedDay={selectedDay}
        refreshKey={refreshKey}
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