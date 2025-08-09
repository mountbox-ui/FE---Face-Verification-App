import { useState, useMemo, useRef, useEffect } from "react";
import API from "../api/api";

export default function SchoolDropdown({ schools, selected, onChange, onSchoolDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const handleDelete = async (schoolId, schoolName) => {
    if (!window.confirm(`Are you sure you want to delete "${schoolName}" and all its students?`)) {
      return;
    }

    setDeleting(true);
    try {
      await API.delete(`/school/${schoolId}`);
      onSchoolDeleted(schoolId);
    } catch (err) {
      alert('Failed to delete school');
    }
    setDeleting(false);
  };

  // Format how each school appears
  const formatLabel = (s) => (s?.affNo ? `${s.name} (${s.affNo})` : s?.name || "");

  // Filter schools by search query (match name or affNo)
  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q
      ? schools.filter(s => (
          (s.name || "").toLowerCase().includes(q) || (s.affNo || "").toLowerCase().includes(q)
        ))
      : schools;
  }, [schools, searchQuery]);

  // Get selected school
  const selectedSchool = schools.find(s => s._id === selected);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSchools.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSchools.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredSchools[highlightedIndex]) {
          onChange(filteredSchools[highlightedIndex]._id);
          setIsOpen(false);
          setSearchQuery("");
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered schools change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredSchools]);

  const handleSchoolSelect = (schoolId) => {
    onChange(schoolId);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
      <div className="relative w-full sm:w-64" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : formatLabel(selectedSchool)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search schools or Affno..."
          className="w-full p-2 border rounded text-sm"
          aria-label="Search and select school"
        />
        
        {/* Dropdown arrow */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Toggle dropdown"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredSchools.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No schools found
              </div>
            ) : (
              filteredSchools.map((school, index) => (
                <button
                  key={school._id}
                  type="button"
                  onClick={() => handleSchoolSelect(school._id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                    index === highlightedIndex ? 'bg-blue-100' : ''
                  } ${school._id === selected ? 'font-medium text-blue-600' : 'text-gray-700'}`}
                >
                  {formatLabel(school)}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected && (
        <button
          className="w-full sm:w-auto bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
          onClick={() => {
            const school = schools.find(s => s._id === selected);
            handleDelete(selected, school?.name);
          }}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete School"}
        </button>
      )}
    </div>
  );
}