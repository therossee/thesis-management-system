import React, { createContext, useEffect, useMemo, useState } from 'react';

import { Col, Row } from 'react-bootstrap';
import { Route, Routes, useLocation } from 'react-router-dom';

import API from './API';
import CustomToast from './components/CustomToast';
import FloatingButton from './components/FloatingButton';
import LoadingModal from './components/LoadingModal';
import PoliNavbar from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import AreaPersonale from './pages/AreaPersonale';
import Carriera from './pages/Carriera';
import Didattica from './pages/Didattica';
import Help from './pages/Help';
import Homepage from './pages/Homepage';
import Opportunita from './pages/Opportunita';
import PageNotFound from './pages/PageNotFound';
import Servizi from './pages/Servizi';
import ConclusioneTesi from './pages/carriera/ConclusioneTesi';
import LaureaEdEsameFinale from './pages/carriera/LaureaEdEsameFinale';
import PropostaDiTesi from './pages/carriera/PropostaDiTesi';
import Tesi from './pages/carriera/Tesi';
import Test from './pages/servizi/Test';
import { getSystemTheme, scrollTop } from './utils/utils';

export const FavoritesContext = createContext(null);
export const ThemeContext = createContext(null);
export const DesktopToggleContext = createContext(null);
export const LoggedStudentContext = createContext(null);
export const BodyDataLoadingContext = createContext(null);
export const ToastContext = createContext(null);

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'auto');
  const [favorites, setFavorites] = useState([]);
  const [desktopToggle, setDesktopToggle] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [loggedStudent, setLoggedStudent] = useState(null);
  const [navbarDataLoading, setNavbarDataLoading] = useState(true);
  const [bodyDataLoading, setBodyDataLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [toastState, setToastState] = useState({
    show: false,
    success: true,
    title: '',
    message: '',
  });
  const location = useLocation();

  const updateTheme = theme => {
    const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', appliedTheme);
    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute(
        'content',
        appliedTheme === 'dark'
          ? getComputedStyle(document.documentElement).getPropertyValue('--background-dark')
          : getComputedStyle(document.documentElement).getPropertyValue('--background-light'),
      );
  };

  useEffect(() => {
    scrollTop();
  }, [location]);

  useEffect(() => {
    updateTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (navbarDataLoading) {
          const allStudents = await API.getStudents();
          if (allStudents && allStudents.length > 0) setAllStudents(allStudents);
          else setAllStudents([]);
          const loggedStudent = await API.getLoggedStudent();
          if (loggedStudent) setLoggedStudent(loggedStudent);
          else setLoggedStudent(null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setNavbarDataLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  const loggedStudentValue = useMemo(() => ({ loggedStudent, setLoggedStudent }), [loggedStudent]);
  const desktopToggleValue = useMemo(() => ({ desktopToggle, setDesktopToggle }), [desktopToggle]);
  const favoritesValue = useMemo(() => ({ favorites, setFavorites }), [favorites]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  const bodyDataLoadingValue = useMemo(() => ({ bodyDataLoading, setBodyDataLoading }), [bodyDataLoading]);
  const toastValue = useMemo(
    () => ({
      showToast: ({ success, title, message }) => {
        setToastState({ show: true, success, title, message });
      },
      hideToast: () => {
        setToastState(prev => ({ ...prev, show: false }));
      },
    }),
    [],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <LoggedStudentContext.Provider value={loggedStudentValue}>
        <DesktopToggleContext.Provider value={desktopToggleValue}>
          <FavoritesContext.Provider value={favoritesValue}>
            <BodyDataLoadingContext.Provider value={bodyDataLoadingValue}>
              <ToastContext.Provider value={toastValue}>
                <LoadingModal show={navbarDataLoading || bodyDataLoading} onHide={() => setNavbarDataLoading(false)} />
                <CustomToast
                  show={toastState.show}
                  success={toastState.success}
                  title={toastState.title}
                  message={toastState.message}
                  onClose={toastValue.hideToast}
                />
                <PoliNavbar
                  allStudents={allStudents}
                  setNavbarDataLoading={setNavbarDataLoading}
                  refresh={refresh}
                  setRefresh={setRefresh}
                />
                <Row className="p-0 m-0" style={{ width: '100vw', height: '100vh' }}>
                  <Sidebar />
                  <Col className={`custom-content reduced ${desktopToggle ? 'minimized' : ''}`}>
                    <Routes>
                      <Route path="/" element={<Homepage />} />
                      <Route path="/area_personale" element={<AreaPersonale />} />
                      <Route path="/home" element={<Homepage />} />
                      <Route path="/didattica" element={<Didattica />} />
                      <Route path="/carriera" element={<Carriera />} />
                      <Route path="/carriera/laurea_ed_esame_finale" element={<LaureaEdEsameFinale />} />
                      <Route path="/opportunita" element={<Opportunita />} />
                      <Route path="/servizi" element={<Servizi />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="*" element={<PageNotFound />} />
                      <Route path="/servizi/test" element={<Test />} />
                      <Route path="/carriera/tesi" element={<Tesi initialActiveTab="thesis" />} />
                      <Route path="/carriera/tesi/proposte_di_tesi" element={<Tesi initialActiveTab="proposals" />} />
                      <Route path="/carriera/tesi/proposta_di_tesi/:id" element={<PropostaDiTesi />} />
                      <Route path="/carriera/tesi/conclusione_tesi" element={<ConclusioneTesi />} />
                    </Routes>
                    <FloatingButton />
                  </Col>
                </Row>
              </ToastContext.Provider>
            </BodyDataLoadingContext.Provider>
          </FavoritesContext.Provider>
        </DesktopToggleContext.Provider>
      </LoggedStudentContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
