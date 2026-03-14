import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PosterMaker from './pages/PosterMaker.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import LayoutSettings from './pages/LayoutSettings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PosterMaker />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/layout" element={<LayoutSettings />} />
      </Routes>
    </BrowserRouter>
  );
}
