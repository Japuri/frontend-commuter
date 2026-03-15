import React from "react";
import "./Spinner.css";

export default function Spinner({ size = 48, color = "#00d4ff", text = "Loading...", inline = false }) {
  return (
    <div className={`spinner-container${inline ? " spinner-inline" : ""}`}>
      <div
        className="spinner-outer"
        style={{ width: size, height: size }}
      >
        <div className="spinner-inner" style={{ borderColor: color }} />
        <div className="spinner-dot" style={{ background: color }} />
      </div>
      {text && <div className="spinner-text">{text}</div>}
    </div>
  );
}
