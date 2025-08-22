import { createRoot } from 'react-dom/client'
import { seedDatabase } from './storage/seed'
import App from './App.tsx'
import './index.css'

// Initialize database on app start
seedDatabase()

createRoot(document.getElementById("root")!).render(<App />);
