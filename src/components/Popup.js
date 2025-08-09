export default function Popup({ show, message, type, onClose }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 bg-white border shadow-lg px-4 sm:px-6 py-3 rounded z-50 flex items-center max-w-sm sm:max-w-md">
      <span className={`mr-2 font-bold flex-shrink-0 ${type === "success" ? "text-green-600" : type === "failed" || type === "error" ? "text-red-600" : "text-gray-600"}`}>
        {type === "success" ? "✔" : type === "failed" || type === "error" ? "✖" : "!"}
      </span>
      <span className="text-sm sm:text-base flex-1">{message}</span>
      <button className="ml-2 sm:ml-4 text-gray-500 hover:text-gray-800 flex-shrink-0" onClick={onClose}>✕</button>
    </div>
  );
}