import React from "react";
import { NavLink } from "react-router-dom";

const sidebar = () => {
  return (
    <div className="d-flex flex-column p-3 bg-dark text-white" style={{ width: "220px", minHeight: "100vh" }}>
      <h4 className="mb-4">Menú</h4>

      <NavLink
        to="/editVideos"
        className={({ isActive }) => `btn text-start text-white mb-2 ${isActive ? "btn-secondary" : "btn-dark"}`}
      >
        Videos To Edit
      </NavLink>

      <NavLink
        to="/"
        className={({ isActive }) => `btn text-start text-white mb-2 ${isActive ? "btn-secondary" : "btn-dark"}`}
      >
        Reviewers
      </NavLink>

      <NavLink
        to="/editRestaurants"
        className={({ isActive }) => `btn text-start text-white ${isActive ? "btn-secondary" : "btn-dark"}`}
      >
        Restaurants
      </NavLink>
    </div>
  );
};

export default sidebar;
