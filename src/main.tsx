import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import DataDashboard from "./features/data-dashboard/DataDashboard";
import type { StoryPackage } from "./shared/linearStory";
import { warmStaticVisualAssets } from "./shared/staticAssetCache";
import "./styles/app.css";

declare const __APP_STORY_PACKAGE__: StoryPackage;

const isDataDashboard = window.location.pathname === "/data" || window.location.pathname === "/data/";
if (isDataDashboard) document.documentElement.classList.add("data-route");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isDataDashboard ? <DataDashboard /> : <App storyPackage={__APP_STORY_PACKAGE__} />}
    {!isDataDashboard && <Analytics />}
  </React.StrictMode>
);

if (!isDataDashboard) warmStaticVisualAssets({ storyPackage: __APP_STORY_PACKAGE__ });
