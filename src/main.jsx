import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Dev-only component gallery at ?ui=gallery. The import is inside the DEV
// branch so it is tree-shaken out of the production bundle entirely.
const isGallery =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('ui') === 'gallery'

const Gallery = isGallery ? lazy(() => import('./dev/Gallery.jsx')) : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isGallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
