import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar({ showLogout = true }) {
	const navigate = useNavigate();
	const location = useLocation();
	const isLoggedIn = useMemo(() => Boolean(localStorage.getItem("token")), []);

	const handleLogout = () => {
		localStorage.removeItem("token");
		navigate("/", { replace: true });
	};

	return (
		<div className="w-full bg-blue-900 text-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img src="/logo192.png" alt="MountBox" className="h-6 w-6" />
					<span className="font-semibold">MountBox</span>
				</div>
				<div className="text-sm sm:text-base font-semibold text-center flex-1">
					Face Verification App
				</div>
				<div className="flex items-center gap-2">
					{showLogout && isLoggedIn && location.pathname !== "/" && (
						<button
							className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
							onClick={handleLogout}
						>
							Logout
						</button>
					)}
				</div>
			</div>
		</div>
	);
}


