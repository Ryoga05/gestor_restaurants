import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import EditReviewers from './pages/editReviewers';
import EditRestaurants from './pages/editRestaurants';
import EditVideos from './pages/editVideos';
import Sidebar from './components/sidebar'; // Asegúrate de la ruta correcta

function App() {
  return (
    <Router>
      <div className="d-flex">
        <Sidebar />
        <div className="flex-grow-1 p-4">
          <Routes>
            <Route path="/" element={<EditReviewers />} />
            <Route path="/editRestaurants" element={<EditRestaurants />} />
            <Route path="/editVideos" element={<EditVideos />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
