# LabTrack page entries

Each HTML file in this folder is a page entry point. It loads the shared `styles.css`, one page-specific CSS file from `page-styles/`, and the shared `app.js` interaction layer.

The `data-page` and `data-role` attributes tell the shared app which screen and demo role to open. This keeps the code organized like a multi-page class project while avoiding duplicated workflow logic.
