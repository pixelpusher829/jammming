import { QueryClient } from "@tanstack/react-query";

// Only retry failures that can plausibly succeed on a second try
function shouldRetry(failureCount, error) {
	if (failureCount >= 2) return false;
	const status = error?.status;
	return !status || status === 429 || status >= 500;
}

function retryDelay(attempt, error) {
	if (error?.retryAfter) return error.retryAfter * 1000;
	return Math.min(1000 * 2 ** attempt, 8000);
}

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000,
				retry: shouldRetry,
				retryDelay,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: false,
			},
		},
	});
}
