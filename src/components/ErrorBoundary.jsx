import { Component } from "react";
import styles from "@/styles/modules/ErrorBoundary.module.css";

/** Last-resort fallback so a render error never leaves a blank page. */
class ErrorBoundary extends Component {
	state = { error: null };

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		console.error("Unhandled UI error:", error, info.componentStack);
	}

	render() {
		if (!this.state.error) return this.props.children;
		return (
			<div className={styles.fallback} role="alert">
				<img src="/jamming.svg" alt="" width="56" height="56" />
				<h1>Something went wrong</h1>
				<p>
					Jammming hit an unexpected error. Your playlist draft is saved in this
					browser, so reloading won’t lose it.
				</p>
				<button type="button" onClick={() => window.location.reload()}>
					Reload Jammming
				</button>
			</div>
		);
	}
}

export default ErrorBoundary;
