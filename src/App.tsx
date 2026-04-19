import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ModalProvider } from '@/context/ModalContext';
import { ConfigProvider } from '@/context/ConfigContext';

import LoadingPage from '@/pages/LoadingPage';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import AdminPage from '@/pages/AdminPage';
import CompetitionPage from '@/pages/CompetitionPage';
import DetailsPage from '@/pages/DetailsPage';
import GuidelinesPage from '@/pages/GuidelinesPage';
import JudgePage from '@/pages/JudgePage';
import ThankyouPage from '@/pages/ThankyouPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Global Ambient Background Orbs */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-700/15 blur-[80px] rounded-full pointer-events-none -z-10" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
      <div className="fixed top-[40%] right-[-10%] w-[400px] h-[400px] bg-purple-700/10 blur-[70px] rounded-full pointer-events-none -z-10" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
      <div className="fixed bottom-[10%] left-[-5%] w-[350px] h-[350px] bg-cyan-700/10 blur-[70px] rounded-full pointer-events-none -z-10" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />

      <AuthProvider>
        <ConfigProvider>
          <ModalProvider>
            <Routes>
              <Route path="/" element={<LoadingPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/competition" element={<CompetitionPage />} />
              <Route path="/details" element={<DetailsPage />} />
              <Route path="/guidelines" element={<GuidelinesPage />} />
              <Route path="/judge" element={<JudgePage />} />
              <Route path="/thankyou" element={<ThankyouPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ModalProvider>
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
