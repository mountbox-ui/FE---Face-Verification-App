import { useState, useRef, useEffect } from "react";
import API from "../api/api";
import * as faceapi from 'face-api.js';
import '@tensorflow/tfjs';

export default function StudentTable({ students, schoolId, onVerifyResult, selectedDay = 'day1', actionsEnabled = true, refreshKey }) {
  const [verifyingId, setVerifyingId] = useState(null);
  const [manualVerifyingId, setManualVerifyingId] = useState(null);
  const [reVerifyingId, setReVerifyingId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraMode, setCameraMode] = useState('verify'); // 'verify' | 'addPhoto'
  const [savingPhotoId, setSavingPhotoId] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [loadingGroupPhoto, setLoadingGroupPhoto] = useState(false);
  const [groupDescriptorsInfo, setGroupDescriptorsInfo] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Load face-api models on component mount
  useEffect(() => {
    loadFaceApiModels();
  }, []);

  // Fetch group photo when schoolId changes
  useEffect(() => {
    if (schoolId) {
      fetchGroupPhoto();
    } else {
      setGroupPhoto(null);
    }
  }, [schoolId]);

  // Refresh descriptors info after regeneration
  useEffect(() => {
    if (schoolId) fetchGroupPhoto();
  }, [refreshKey]);

  const loadFaceApiModels = async () => {
    try {
      try {
        await faceapi.tf.setBackend('webgl');
      } catch {
        await faceapi.tf.setBackend('cpu');
      }
      await faceapi.tf.ready();
      await faceapi.loadTinyFaceDetectorModel('/models');
      await faceapi.loadFaceLandmarkTinyModel('/models');
      await faceapi.loadFaceRecognitionModel('/models');
      setModelsLoaded(true);
      console.log('Face-api models loaded successfully');
    } catch (error) {
      console.error('Error loading face-api models:', error);
    }
  };

  const fetchGroupPhoto = async () => {
    if (!schoolId) return;
    
    setLoadingGroupPhoto(true);
    try {
      console.log('Fetching group photo for schoolId:', schoolId);
      const response = await API.get(`/school/${schoolId}`);
      console.log('School response:', response.data);
      
      if (response.data.groupPhoto) {
        console.log('Group photo found:', response.data.groupPhoto);
        setGroupPhoto(response.data.groupPhoto);
      } else {
        console.log('No group photo found in response');
        setGroupPhoto(null);
      }
      
      // Store group descriptors information
      setGroupDescriptorsInfo({
        hasGroupDescriptors: response.data.hasGroupDescriptors,
        descriptorsCount: response.data.descriptorsCount
      });
    } catch (error) {
      console.error('Error fetching group photo:', error);
      setGroupPhoto(null);
      setGroupDescriptorsInfo(null);
    } finally {
      setLoadingGroupPhoto(false);
    }
  };

  const handleVerify = async (student) => {
    if (!modelsLoaded) {
      alert('Face detection models are still loading. Please wait a moment and try again.');
      return;
    }

    setCurrentStudent(student);
    setShowCamera(true);
    setCapturedImage(null);
    setCameraMode('verify');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          inlineSize: 640, 
          blockSize: 480,
          facingMode: 'user'
        },
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      onVerifyResult("failed", `Camera access denied: ${err.message}`);
    }
  };

  const handleAddPhoto = async (student) => {
    setCurrentStudent(student);
    setShowCamera(true);
    setCapturedImage(null);
    setCameraMode('addPhoto');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          inlineSize: 640,
          blockSize: 480,
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      onVerifyResult("failed", `Camera access denied: ${err.message}`);
    }
  };

  const handleManualVerify = async (student) => {
    if (!window.confirm(`Are you sure you want to manually verify ${student.name}?`)) {
      return;
    }

    setManualVerifyingId(student._id);
    
    try {
      const response = await API.post(`/student/${student._id}/manual-verify`, {
        day: selectedDay
      });
      onVerifyResult("success", `Manually verified ${student.name} successfully.`);
    } catch (err) {
      console.error('Manual verification error:', err);
      onVerifyResult("failed", `Manual verification failed: ${err.message}`);
    }
    
    setManualVerifyingId(null);
  };

  const handleReVerify = async (student) => {
    if (!window.confirm(`Are you sure you want to re-verify ${student.name}? This will reset their current verification status.`)) {
      return;
    }

    setReVerifyingId(student._id);
    
    try {
      const dayNumber = parseInt(selectedDay.replace('day', ''), 10);

      // If Day 1, clear stored Day 1 photo so it can be replaced on next verification
      if (selectedDay === 'day1') {
        await API.post(`/student/${student._id}/reset-verification`, { clearDay1Photo: true });
      }

      // Revert current day's verification to pending for this student
      await API.post(`/student/${student._id}/day/${dayNumber}/result`, {
        result: 'pending',
        confidence: null
      });

      onVerifyResult("success", `Reverted ${selectedDay} status to Pending for ${student.name}.`);
    } catch (err) {
      console.error('Re-verification reset error:', err);
      onVerifyResult("failed", `Failed to reset verification: ${err.message}`);
    }
    
    setReVerifyingId(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
    }
  };

  const submitVerification = async () => {
    if (!capturedImage || !currentStudent) return;
    
    setVerifyingId(currentStudent._id);
    
    try {
      const img = await faceapi.fetchImage(capturedImage);
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const faces = await faceapi.detectAllFaces(img, options);
      if (faces.length === 0) {
        onVerifyResult("failed", "No face detected in the photo. Please retake the photo.");
        closeCamera();
        setVerifyingId(null);
        return;
      }
      if (faces.length > 1) {
        onVerifyResult("failed", "Multiple faces detected. Please ensure only one face is in the photo.");
        closeCamera();
        setVerifyingId(null);
        return;
      }

      const result = await faceapi
        .detectSingleFace(img, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!result?.descriptor) {
        onVerifyResult("failed", "No face descriptor extracted. Please retake the photo.");
        closeCamera();
        setVerifyingId(null);
        return;
      }

      const descriptor = Array.from(result.descriptor);

      const response = await API.post(`/verification/${currentStudent._id}`, {
        descriptor,
        studentId: currentStudent._id,
        schoolId: schoolId
      });
      
      const verifyResult = response.data.result;
      const message = response.data.message;

      // Save day result (and Day 1 photo) for the 6-day workflow
      const dayNumber = parseInt(selectedDay.replace('day', ''), 10);
      await API.post(`/student/${currentStudent._id}/day/${dayNumber}/result`, {
        result: verifyResult === 'success' ? 'success' : (verifyResult === 'failed' ? 'failed' : 'pending'),
        confidence: response?.data?.details?.confidence,
        photo: selectedDay === 'day1' ? capturedImage : undefined
      });

      onVerifyResult(verifyResult, message);
      
    } catch (err) {
      console.error('Verification error:', err);
      onVerifyResult("failed", `Verification failed: ${err.message}`);
    }
    
    closeCamera();
    setVerifyingId(null);
  };

  const submitDay1Photo = async () => {
    if (!capturedImage || !currentStudent) return;

    setSavingPhotoId(currentStudent._id);
    try {
      await API.post(`/student/${currentStudent._id}/day/1/result`, {
        result: 'pending',
        confidence: null,
        photo: capturedImage
      });

      onVerifyResult('success', `Saved Day 1 photo for ${currentStudent.name}. Status set to Pending.`);
    } catch (err) {
      console.error('Save Day 1 photo error:', err);
      onVerifyResult('failed', `Failed to save Day 1 photo: ${err.message}`);
    }

    closeCamera();
    setSavingPhotoId(null);
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
    setCapturedImage(null);
    setCurrentStudent(null);
  };

  

  return (
    <div>
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {cameraMode === 'addPhoto' ? `Add Day 1 Photo for ${currentStudent?.name}` : `Verify ${currentStudent?.name}`}
              </h3>
              <button
                onClick={closeCamera}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Camera Feed */}
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-2">Camera Feed</h4>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 sm:h-64 bg-gray-900 rounded"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!capturedImage && (
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={capturePhoto}
                      className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                    >
                      {cameraMode === 'addPhoto' ? 'Capture Photo' : 'Capture Photo'}
                    </button>
                    <p className="text-xs text-gray-600">
                      Make sure the face is clearly visible and well-lit
                    </p>
                  </div>
                )}
              </div>
              
              {/* Captured Image */}
              {capturedImage && (
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-2">Captured Photo</h4>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-48 sm:h-64 object-cover rounded border"
                  />
                  <div className="mt-2 space-y-2 sm:space-y-0 sm:space-x-2 sm:flex">
                    <button
                      onClick={capturePhoto}
                      className="w-full sm:w-auto bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
                    >
                      Retake
                    </button>
                    {cameraMode === 'addPhoto' ? (
                      <button
                        onClick={submitDay1Photo}
                        disabled={savingPhotoId === currentStudent?._id}
                        className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                      >
                        {savingPhotoId === currentStudent?._id ? 'Saving...' : 'Save Photo'}
                      </button>
                    ) : (
                      <button
                        onClick={submitVerification}
                        disabled={verifyingId === currentStudent?._id}
                        className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                      >
                        {verifyingId === currentStudent?._id ? "Verifying..." : "Submit Verification"}
                      </button>
                    )}
                  </div>
                  {cameraMode !== 'addPhoto' && (
                    <p className="text-xs text-gray-600 mt-2">
                      Face detected ✓ - Ready for verification
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {!modelsLoaded && (
              <div className="mt-4 p-2 bg-yellow-100 rounded">
                <p className="text-sm text-yellow-800">
                  Loading face detection models... Please wait.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded shadow mb-6 min-w-full">
          <thead>
            <tr>
              <th className="p-2 border text-xs sm:text-sm">Register No</th>
              <th className="p-2 border text-xs sm:text-sm">Name</th>
              <th className="p-2 border text-xs sm:text-sm">Class</th>
              <th className="p-2 border text-xs sm:text-sm">D.O.B</th>
              
              <th className="p-2 border text-xs sm:text-sm">Day 1 Photo</th>
              <th className="p-2 border text-xs sm:text-sm">Status</th>
              <th className="p-2 border text-xs sm:text-sm">Action</th>
              <th className="p-2 border text-xs sm:text-sm">Manual Verification</th>
              <th className="p-2 border text-xs sm:text-sm">Re-verify</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student._id}>
                <td className="p-2 border text-xs sm:text-sm">{student.registrationNo}</td>
                <td className="p-2 border text-xs sm:text-sm">{student.name}</td>
                <td className="p-2 border text-xs sm:text-sm">{student.class}</td>
                <td className="p-2 border text-xs sm:text-sm">{student.dob}</td>
                
                <td className="p-2 border text-xs sm:text-sm">
                  {student.day1Photo ? (
                    <div className="relative inline-block w-16 h-16 overflow-hidden rounded border shadow-sm group">
                      <img
                        src={student.day1Photo}
                        alt="Day 1"
                        title="Day 1 Photo"
                        className="w-full h-full object-cover transition-transform duration-200 ease-out hover:scale-125 cursor-pointer"
                      />
                      {/* Hover Lightbox (50% of screen) */}
                      <div className="fixed inset-0 z-50 hidden items-center justify-center group-hover:flex pointer-events-none">
                        <div className="absolute inset-0 bg-black/60" />
                        <img
                          src={student.day1Photo}
                          alt="Day 1 Large"
                          className="relative w-[50vw] max-h-[80vh] object-contain rounded shadow-2xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      className="bg-indigo-500 text-white px-2 sm:px-3 py-1 rounded hover:bg-indigo-600 text-xs sm:text-sm"
                      onClick={() => handleAddPhoto(student)}
                    >
                      Add Photo
                    </button>
                  )}
                </td>
                <td className="p-2 border text-xs sm:text-sm">
                  {student.dayResult === "success"
                    ? <span className="text-green-600">✅ Verified</span>
                    : student.dayResult === "manually_verified"
                    ? <span className="text-blue-600 font-medium">👤 Manually Verified</span>
                    : student.dayResult === "failed"
                    ? <span className="text-red-600">❌ Failed</span>
                    : <span className="text-gray-600">⏳ Pending</span>
                  }
                </td>
                <td className="p-2 border">
                  <button
                    className="bg-white text-black border border-blue-500 px-2 sm:px-3 py-1 rounded hover:bg-blue-50 disabled:opacity-50 text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
                    onClick={() => handleVerify(student)}
                    disabled={!actionsEnabled || verifyingId === student._id || student.dayResult === "success" || student.dayResult === "manually_verified"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.176 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {verifyingId === student._id ? "Verifying..." : "Verify"}
                  </button>
                </td>
                <td className="p-2 border">
                  <button
                    className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50 text-xs sm:text-sm"
                    onClick={() => handleManualVerify(student)}
                    disabled={!actionsEnabled || manualVerifyingId === student._id || student.dayResult === "manually_verified"}
                  >
                    {manualVerifyingId === student._id ? "Verifying..." : "Manual Verify"}
                  </button>
                </td>
                <td className="p-2 border">
                  <button
                    className="bg-orange-500 text-white px-2 sm:px-3 py-1 rounded hover:bg-orange-600 disabled:opacity-50 text-xs sm:text-sm"
                    onClick={() => handleReVerify(student)}
                    disabled={!actionsEnabled || reVerifyingId === student._id}
                  >
                    {reVerifyingId === student._id ? "Resetting..." : "Re-verify"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Group Photo Section */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Group Photo</h3>
        
        {loadingGroupPhoto && (
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500 text-sm">Loading group photo...</div>
          </div>
        )}
        
        {!loadingGroupPhoto && groupPhoto && (
          <div>
            <div className="flex justify-center mb-3">
              <img
                src={groupPhoto}
                alt="Group Photo"
                className="max-w-full h-auto max-h-64 sm:max-h-96 rounded shadow-lg"
                onError={(e) => {
                  console.error('Error loading group photo:', e);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-red-500 text-center mt-2 text-sm">
                Error loading group photo. Please check if the file exists.
              </div>
            </div>
            
            {/* Group Descriptors Status */}
            {groupDescriptorsInfo && (
              <div className="mt-3 p-3 rounded border">
                {groupDescriptorsInfo.hasGroupDescriptors ? (
                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">
                      Face descriptors ready: {groupDescriptorsInfo.descriptorsCount} faces detected
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">
                      No face descriptors found. Face verification will not work.
                    </span>
                  </div>
                )}
                
                {!groupDescriptorsInfo.hasGroupDescriptors && (
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    <p>• Click "Regenerate Face Descriptors" button above to extract faces from the group photo</p>
                    <p>• Ensure the group photo contains clear, visible faces</p>
                    <p>• If the issue persists, upload a new group photo with better quality</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {!loadingGroupPhoto && !groupPhoto && students.length > 0 && (
          <div className="text-center py-8">
            <div className="text-yellow-600 mb-2">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-yellow-800 font-medium text-sm sm:text-base">No group photo uploaded for this school yet.</p>
            <p className="text-yellow-600 text-xs sm:text-sm mt-1">
              Upload a group photo when adding a school to enable face verification.
            </p>
          </div>
        )}
        
        {!loadingGroupPhoto && students.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No students found for this school.</p>
          </div>
        )}
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
          <p><strong>Debug Info:</strong></p>
          <p>School ID: {schoolId}</p>
          <p>Selected Day: {selectedDay}</p>
          <p>Students Count: {students.length}</p>
          <p>Models Loaded: {modelsLoaded ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
}