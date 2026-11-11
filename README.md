# CouncilOS — Holistic Life & Advisory Assistant

An integrated life companion: an AI Advisory Council (Strategist, Performance Coach, Wellness Doctor, Time Architect), a multi-app telemetry hub (Strava, Garmin, Google Calendar, Notion, Oura/Sleep), a time-blocking schedule manager, morning briefings, and a daily improvement audit. Built with React + Vite on the frontend and a Node/Express proxy to Vertex AI (Gemini) on the backend.

## Quick start

```bash
cp backend/.env.example backend/.env.local   # then set GOOGLE_CLOUD_PROJECT
gcloud auth application-default login
npm install
npm run dev
```

The frontend runs on Vite's dev server (http://localhost:5173) and proxies `/api-proxy` and `/ws-proxy` to the backend on port 5000.

`backend/.env.local` is git-ignored. `PROXY_HEADER` must match the `X-App-Proxy` value in `frontend/vertex-ai-proxy-interceptor.js`.

## Deploy to Cloud Run (from this repo)

The `Dockerfile` builds the frontend and serves it from the Node backend in a single container.
From [Cloud Shell](https://shell.cloud.google.com) (already signed in to your project):

```bash
git clone https://github.com/wolfberserkr/life-auditor.git
cd life-auditor
gcloud run deploy councilos --source . --region us-central1 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project) \
  --no-allow-unauthenticated
```

`--no-allow-unauthenticated` keeps the app (and your Vertex AI quota) private. To open it, run
`gcloud run services proxy councilos --region us-central1 --port 8080` in Cloud Shell and use
**Web Preview → Preview on port 8080**.

---

## Original export notes (Vertex AI Studio)

This repository contains a frontend and a Node.js backend, designed to run together.
The backend acts as a proxy, handling Google Cloud API calls.

This project is intended for demonstration and prototyping purposes only.
It is not intended for use in a production environment.

## Prerequisites

To run this application locally, you need:

*   **[Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)**: Follow the instructions to install the SDK.

*   **gcloud Initialization**:
    *   Initialize the gcloud CLI:
        ```bash
        gcloud init
        ```
    *   Authenticate for Application Default Credentials (needed to call Google Cloud APIs):
        ```bash
        gcloud auth application-default login
        ```

*   **Node.js and npm**: Ensure you have Node.js and its package manager, `npm`, installed on your machine.

## Project Structure

The project is organized into two main directories:

*   `frontend/`: Contains the Frontend application code.
*   `backend/`: Contains the Node.js/Express server code to proxy Google Cloud API calls.

## Backend Environment Variables

The `backend/.env.local` file is generated when you download this application from Vertex AI Studio. It is not committed; copy `backend/.env.example` to create it.
It contains essential Google Cloud environment variables pre-configured based on your project settings at the time of download.

The variables set in `backend/.env.local` are:
*   `API_BACKEND_PORT`: The port the backend API server listens on (e.g., `5000`).
*   `API_PAYLOAD_MAX_SIZE`: The maximum size of the request payload accepted by the backend server (e.g., `5mb`).
*   `GOOGLE_CLOUD_LOCATION`: The Google Cloud region associated with your project.
*   `GOOGLE_CLOUD_PROJECT`: Your Google Cloud Project ID.

**Note:** These variables are automatically populated during the download process.
You can modify the values in `backend/.env.local` if you need to change them.

## Installation and Running the App

To install dependencies and run your Google Cloud Vertex AI Studio App locally, execute the following command:

```bash
npm install && npm run dev
```
