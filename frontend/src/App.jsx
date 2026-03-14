import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PosterMaker from './pages/PosterMaker.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PosterMaker />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
