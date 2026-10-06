import { AlertCircle, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/modules/SignInBanner.module.css";

/** Sign-in problems (cancelled login, expired session) shown under the header. */
export default function SignInBanner() {
	const { error, dismissError, login } = useAuth();
	if (!error) return null;

	return (
		<div className={styles.alert} role="alert">
			<AlertCircle size={18} aria-hidden="true" />
			<p>{error}</p>
			<button type="button" className={styles.retry} onClick={login}>
				Sign in again
			</button>
			<button
				type="button"
				className={styles.dismiss}
				onClick={dismissError}
				aria-label="Dismiss message"
			>
				<X size={16} aria-hidden="true" />
			</button>
		</div>
	);
}
