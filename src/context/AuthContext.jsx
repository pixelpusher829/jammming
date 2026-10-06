import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import {
	beginLogin,
	logout as clearSession,
	initSession,
	onSessionExpired,
} from "@/lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const queryClient = useQueryClient();
	// "loading" until we know whether a session exists, then "guest" | "authenticated"
	const [status, setStatus] = useState("loading");
	const [error, setError] = useState(null);

	useEffect(() => {
		let cancelled = false;
		initSession()
			.then((signedIn) => {
				if (!cancelled) setStatus(signedIn ? "authenticated" : "guest");
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err.message);
				setStatus("guest");
			});

		const unsubscribe = onSessionExpired(() => {
			queryClient.removeQueries({ queryKey: ["me"] });
			setError("Your Spotify session expired. Sign in again to keep saving.");
			setStatus("guest");
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [queryClient]);

	async function login() {
		setError(null);
		try {
			await beginLogin();
		} catch {
			setError("Couldn't start Spotify sign-in. Please try again.");
		}
	}

	async function logout() {
		await clearSession();
		queryClient.removeQueries({ queryKey: ["me"] });
		setStatus("guest");
	}

	const value = {
		status,
		isAuthenticated: status === "authenticated",
		error,
		dismissError: () => setError(null),
		login,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
