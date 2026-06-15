import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import type { StoryPackage } from "./shared/linearStory";
import "./styles/app.css";

declare const __APP_STORY_PACKAGE__: StoryPackage;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App storyPackage={__APP_STORY_PACKAGE__} />
  </React.StrictMode>
);
