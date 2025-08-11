import axios from 'axios';

export async function handleUpload(excelFile, photoFile) {
  const formData = new FormData();
  if (excelFile) formData.append('excel', excelFile);
  if (photoFile) formData.append('groupPhoto', photoFile);

  const API = process.env.REACT_APP_API_URL || 'https://be-face-verification-app.onrender.com';

  const res = await axios.post(`${API}/api/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}