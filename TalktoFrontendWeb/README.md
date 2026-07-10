# Talkto Web

A lightweight browser frontend for the FastAPI backend in this workspace.

## Run locally

1. Start the FastAPI backend:
   - From the backend folder run: `python app/main.py`
2. Start the web app from this folder:
   - Windows: `start.bat`
   - Or: `python -m http.server 3000`
3. Open: `http://127.0.0.1:3000`

## Notes

- The UI uses the backend API directly from the browser.
- Default API URL is `http://127.0.0.1:8000`.
- If your backend runs on another host/port, update the API Base URL field in the page.
