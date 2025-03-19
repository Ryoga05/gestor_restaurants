import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import EditReviewers from './pages/editReviewers';
import EditRestaurants from './pages/editRestaurants';
import EditVideos from './pages/editVideos';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditReviewers />} />
        <Route path="/editRestaurants" element={<EditRestaurants />} />
        <Route path="/editVideos" element={<EditVideos />} />
      </Routes>
    </Router>
  );
}

export default App;
