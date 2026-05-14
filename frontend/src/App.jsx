import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PosterMaker from './pages/PosterMaker.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import LayoutSettings from './pages/LayoutSettings.jsx';
import NewsMitraMaker from './pages/NewsMitraMaker.jsx';
import NewsMitraAdmin from './pages/NewsMitraAdmin.jsx';
import NandUtsavMaker from './pages/NandUtsavMaker.jsx';
import NandUtsavLayout from './pages/NandUtsavLayout.jsx';
import RukmaniVivahMaker from './pages/RukmaniVivahMaker.jsx';
import RukmaniVivahLayout from './pages/RukmaniVivahLayout.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PosterMaker />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/layout" element={<LayoutSettings />} />
        <Route path="/newsmitra" element={<NewsMitraMaker />} />
        <Route path="/newsmitra/admin" element={<NewsMitraAdmin />} />
        <Route path="/nand-utsav" element={<NandUtsavMaker />} />
        <Route path="/nand-utsav/layout" element={<NandUtsavLayout />} />
        <Route path="/rukmani-vivah" element={<RukmaniVivahMaker />} />
        <Route path="/rukmani-vivah/layout" element={<RukmaniVivahLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
