import * as React from "react";
import { useReplit } from "@replit/extensions-react";
import { bridge } from "../bridge.js";

console.log("🚀 Replit MCP Bridge Extension - Loading...");

function App() {
  const { replit } = useReplit();
  const [token, setToken] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [connected, setConnected] = React.useState(false);

  console.log("📱 React component mounted, initializing Replit extensions...");

  // Initialize the bridge when component mounts
  React.useEffect(() => {
    const initBridge = async () => {
      console.log("🔌 Starting bridge initialization...");

      try {
        console.log("📡 Calling bridge.init() with Replit extensions...");
        await bridge.init(replit);
        setConnected(true);
        console.log("✅ Bridge initialized successfully!");

        // Update status every 2 seconds
        const statusInterval = setInterval(() => {
          const isConnected = bridge.isConnected();
          const workspaceId = bridge.getWorkspaceId();
          console.log(`📊 Bridge Status: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'} | Workspace: ${workspaceId || 'N/A'}`);
        }, 2000);

        return () => {
          clearInterval(statusInterval);
          console.log("🛑 Status monitoring stopped");
        };
      } catch (err) {
        console.error("❌ Failed to initialize bridge:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize bridge");
      }
    };

    initBridge();
  }, [replit]);

  const generateToken = async () => {
    console.log("🔑 Generating JWT token...");
    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const jwtToken = await replit.experimental.auth.getAuthToken();
      setToken(jwtToken);
      console.log("✅ JWT token generated successfully!");
      console.log(`📝 Token length: ${jwtToken.length} characters`);
      console.log(`🔍 Token starts with: ${jwtToken.substring(0, 20)}...`);
    } catch (err) {
      console.error("❌ Failed to generate token:", err);
      setError(err instanceof Error ? err.message : "Failed to generate token");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (token) {
      console.log("📋 Copying token to clipboard...");
      navigator.clipboard.writeText(token);
      setCopied(true);
      console.log("✅ Token copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        console.log("🔄 Copy status reset");
      }, 2000);
    }
  };

  return (
    <div style={{
      padding: "24px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      {/* Bridge Status */}
      <div style={{
        backgroundColor: connected ? "#d4edda" : "#f8d7da",
        border: `1px solid ${connected ? "#c3e6cb" : "#f5c6cb"}`,
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "24px"
      }}>
        <strong>🔌 MCP Bridge Status: </strong>
        <span style={{ color: connected ? "#155724" : "#721c24" }}>
          {connected ? "✅ Connected to MCP Server" : "❌ Not connected"}
        </span>
        {bridge.getWorkspaceId() && (
          <div style={{ fontSize: "12px", marginTop: "4px", color: "#666" }}>
            Workspace: {bridge.getWorkspaceId()}
          </div>
        )}
      </div>

      <h1 style={{
        fontSize: "24px",
        fontWeight: "600",
        marginBottom: "8px",
        color: "#1a1a1a"
      }}>
        Replit MCP Bridge
      </h1>

      <p style={{
        fontSize: "14px",
        color: "#666",
        marginBottom: "24px"
      }}>
        This extension connects your Replit workspace to Cursor IDE through a WebSocket bridge.
      </p>

      {/* Instructions */}
      <div style={{
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: "#e7f3ff",
        border: "1px solid #b3d9ff",
        borderRadius: "6px"
      }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#0066cc" }}>
          📋 How to Use
        </h3>
        <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#333" }}>
          <li>Ensure the bridge is connected (green status above)</li>
          <li>Start MCP server locally: <code>npm start</code></li>
          <li>In Cursor, use <code>replit_connect</code></li>
          <li>Use tools: <code>replit_read_file</code>, <code>replit_run_command</code>, etc.</li>
        </ol>
      </div>

      {/* Token Generator */}
      <div style={{
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        padding: "16px"
      }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "12px",
          color: "#1a1a1a"
        }}>
          🔑 JWT Token Generator
        </h2>

        <p style={{
          fontSize: "14px",
          color: "#666",
          marginBottom: "16px"
        }}>
          Generate a JWT token manually if needed (not required for Cursor).
        </p>

        <button
          onClick={generateToken}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#ccc" : "#0079f2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "12px 24px",
            fontSize: "14px",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "16px"
          }}
        >
          {loading ? "Generating..." : "Generate Token"}
        </button>

        {error && (
          <div style={{
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "16px",
            color: "#c00"
          }}>
            ⚠️ {error}
          </div>
        )}

        {token && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "6px",
            padding: "16px",
            border: "1px solid #ddd"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px"
            }}>
              <span style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#666"
              }}>
                JWT Token
              </span>
              <button
                onClick={copyToken}
                style={{
                  backgroundColor: copied ? "#10b981" : "#fff",
                  color: copied ? "white" : "#333",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>

            <div style={{
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "12px",
              fontSize: "12px",
              fontFamily: "monospace",
              wordBreak: "break-all",
              color: "#333"
            }}>
              {token}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Initialize and render
console.log("🔧 Initializing @replit/extensions-react...");

import('@replit/extensions-react').then(({ init }) => {
  console.log("📦 @replit/extensions-react imported, calling init()...");

  init().then(() => {
    console.log("✅ Replit extensions initialized!");

    const root = document.getElementById("root");
    if (root) {
      console.log("🎯 Rendering React app to DOM...");
      render(<App />, root);
      console.log("🎉 React app rendered successfully!");
    } else {
      console.error("❌ Root element not found!");
    }
  }).catch(error => {
    console.error("❌ Failed to initialize Replit extensions:", error);
  });
}).catch(error => {
  console.error("❌ Failed to import @replit/extensions-react:", error);
});