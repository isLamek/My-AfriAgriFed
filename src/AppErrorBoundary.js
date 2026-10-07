import React from "react";

const RELOAD_KEY = "aaf_chunk_reload_at";

const isChunkError = (error) =>
  /ChunkLoadError|Loading chunk|Loading CSS chunk|Unexpected token '<'|dynamically imported module/i.test(
    `${error?.name || ""} ${error?.message || ""}`
  );

/**
 * React.lazy that survives a new deploy: if this tab still runs the old
 * version, its page files no longer exist, so reload once to get the new one.
 */
export function lazyWithReload(load) {
  return React.lazy(() =>
    load().catch((error) => {
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
      } catch {
        // storage blocked: fall through to the error screen
      }
      if (isChunkError(error) && Date.now() - last > 30000) {
        try {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        window.location.reload();
        return new Promise(() => {}); // wait for the reload
      }
      throw error;
    })
  );
}

/** Shows a short message and a Reload button instead of a white page. */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[AfriAgriFed] page crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const update = isChunkError(this.state.error);
    return (
      <div className="aaf-crash" role="alert">
        <div className="aaf-crash-card">
          <h1>{update ? "AfriAgriFed has been updated" : "Something went wrong on this page"}</h1>
          <p>
            {update
              ? "Reload to get the latest version."
              : "Please reload. If it keeps happening, go back to your dashboard and tell us what you were doing."}
          </p>
          {!update && (
            <details className="aaf-crash-details">
              <summary>Technical details (for the AfriAgriFed team)</summary>
              <code>
                {window.location.pathname}: {String(this.state.error?.name || "Error")}: {String(this.state.error?.message || "").slice(0, 300)}
              </code>
            </details>
          )}
          <div className="aaf-crash-actions">
            <button type="button" className="aaf-btn aaf-btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" className="aaf-btn aaf-btn-ghost" onClick={() => (window.location.href = "/dashboard")}>
              Go to my dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
