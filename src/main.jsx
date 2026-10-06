import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./components/App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { createQueryClient } from "./lib/queryClient.js";

const queryClient = createQueryClient();

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<ErrorBoundary>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<App />
				</AuthProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	</StrictMode>,
);
