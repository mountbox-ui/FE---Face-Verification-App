import { useEffect, useMemo, useState } from "react";
import API from "../api/api";
import AddSchoolModal from "../components/AddSchoolModal";
import SchoolDropdown from "../components/SchoolDropdown";
import StudentTable from "../components/StudentTable";
import Popup from "../components/Popup";
import * as faceapi from 'face-api.js';

// Format like "13th Aug"
function ordinalSuffix(n) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

function formatDateLabel(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${day}${ordinalSuffix(day)} ${month}`;
}

export default function Dashboard() {
  // State variables
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [selectedDay, setSelectedDay] = useState("day1"); // day1..day6
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSchoolDetails, setSelectedSchoolDetails] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Event start date (local time midnight). Configure via .env as REACT_APP_EVENT_START_DATE=2025-08-13
  const eventStartDate = useMemo(() => {
    const iso = process.env.REACT_APP_EVENT_START_DATE || new Date().toISOString().slice(0,10);
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d.getTime()) ? new Date(new Date().toISOString().slice(0,10) + 'T00:00:00') : d;
  }, []);

  // Build four consecutive days starting from start date
  const days = useMemo(() => {
    return new Array(4).fill(0).map((_, i) => {
      const date = new Date(eventStartDate);
      date.setDate(date.getDate() + i);
      return {
        key: `day${i + 1}`,
        index: i + 1,
        date,
        label: formatDateLabel(date)
      };
    });
  }, [eventStartDate]);

  // Determine active day based on current date (local)
  const activeDayIndex = useMemo(() => {
    const today = new Date(new Date(now).toISOString().slice(0,10) + 'T00:00:00');
    const diffDays = Math.floor((today - eventStartDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1; // before start -> treat day1 as active upcoming
    if (diffDays > 3) return 4; // after 4-day window -> stick to day4
    return diffDays + 1;
  }, [now, eventStartDate]);

  // Keep time updated to switch at midnight
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) fetchStudents(selectedSchool, selectedDay);
    if (selectedSchool) fetchSelectedSchoolDetails(selectedSchool);
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

  const fetchSelectedSchoolDetails = async (schoolId) => {
    try {
      const res = await API.get(`/school/${schoolId}`);
      setSelectedSchoolDetails(res.data);
    } catch (e) {
      setSelectedSchoolDetails(null);
    }
  };

  const handleAddSchool = () => setShowModal(true);

  const handleSchoolAdded = (newSchool) => {
    setShowModal(false);
    fetchSchools();
    if (newSchool?._id) {
      setSelectedSchool(newSchool._id);
      setSelectedSchoolDetails(prev => ({
        ...(prev || {}),
        _id: newSchool._id,
        name: newSchool.name,
        affNo: newSchool.affNo,
        coachName: newSchool.coachName
      }));
    }
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

  const handleDownloadDay = async (dayIndex) => {
    try {
      const res = await API.get(`/student/download/day/${dayIndex}` , {
        params: { schoolId: selectedSchool },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `day_${dayIndex}_details.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPopup({ show: true, message: `Day ${dayIndex} details downloaded!`, type: 'success' });
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

      // Load only tiny models which are present in /models to avoid 404s
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      const img = await faceapi.fetchImage(groupPhoto);

      // Upscale image via an offscreen canvas to help with small faces
      const off = document.createElement('canvas');
      const scale = 1.5; // upscale 1.5x
      off.width = Math.round(img.width * scale);
      off.height = Math.round(img.height * scale);
      const ctx = off.getContext('2d');
      ctx.drawImage(img, 0, 0, off.width, off.height);
      const upscaledImg = await faceapi.fetchImage(off.toDataURL('image/jpeg', 0.92));

      const detections = await faceapi
        .detectAllFaces(upscaledImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.25 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      if (!detections.length) throw new Error('No faces detected in group photo');

      const descriptors = detections.map(d => Array.from(d.descriptor));
      await API.post(`/school/${selectedSchool}/group-descriptors`, { descriptors });
      setRefreshKey(k => k + 1);
      setPopup({ show: true, message: `Face descriptors ready: ${descriptors.length}`, type: 'success' });
      return true;
    } catch (e) {
      setPopup({ show: true, message: e.message || 'Client-side regeneration failed', type: 'error' });
      return false;
    }
  };

  const handleRegenerateDescriptors = async () => {
    if (!selectedSchool) {
      setPopup({ show: true, message: "Please select a school first", type: "error" });
      return;
    }

    // Try client-side first
    const localOk = await clientSideRegenerate();
    if (localOk) return;

    // Fallback to server-driven regeneration
    try {
      setPopup({ show: true, message: "Local regen failed. Trying server...", type: "info" });
      await API.post(`/school/${selectedSchool}/regenerate-descriptors`);
      const result = await pollDescriptorsReady(selectedSchool);
      if (result.status === 'ready') {
        setPopup({ show: true, message: `Face descriptors ready: ${result.count}`, type: 'success' });
        setRefreshKey(k => k + 1);
      } else if (result.status === 'error') {
        setPopup({ show: true, message: `Descriptor regeneration failed on server`, type: 'error' });
      } else {
        setPopup({ show: true, message: 'Descriptor regeneration timed out on server', type: 'error' });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to regenerate descriptors";
      setPopup({ show: true, message: errorMessage, type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between w-full">
          {/* Left controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 flex-wrap">
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
              {days.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
            <button
              className="w-full sm:w-auto bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              onClick={handleRegenerateDescriptors}
            >
              Regenerate Face Descriptors
            </button>
          </div>

          {/* Right-aligned controls */}
          <div className="w-full sm:w-auto sm:ml-4 flex gap-2 justify-end">
            <button
              className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
              onClick={handleDownloadVerifiedOnly}
              title="Download only verified profiles for current school"
            >
              Download Verified Only
            </button>
            {selectedDay === 'day1' && (
              <button
                className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={handleAddSchool}
              >
                Add School
              </button>
            )}
          </div>
        </div>

        {/* School info header */}
        {selectedSchoolDetails && (
          <div className="bg-white rounded shadow p-3">
            <div className="text-sm sm:text-base font-semibold">
              {selectedSchoolDetails.name}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Affiliation No: {selectedSchoolDetails.affNo || 'N/A'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Age Group: {students[0]?.ageGroup || 'N/A'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Coach Name: {selectedSchoolDetails.coachName || 'N/A'}
            </div>
          </div>
        )}

        {/* Per-day downloads (enable for completed and current days only) */}
        <div className="flex flex-wrap gap-2">
          {days.map(d => (
            <button
              key={`dl-${d.key}`}
              className={`px-3 py-2 rounded text-sm ${d.index <= activeDayIndex ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
              onClick={() => handleDownloadDay(d.index)}
              disabled={d.index > activeDayIndex}
              title={`Download details for ${d.label}`}
            >
              Download {d.label}
            </button>
          ))}
        </div>
      </div>
      
      <StudentTable
        students={students}
        schoolId={selectedSchool}
        onVerifyResult={handleVerifyResult}
        selectedDay={selectedDay}
        actionsEnabled={(() => {
          const found = days.find(d => d.key === selectedDay);
          return found ? found.index === activeDayIndex : false;
        })()}
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