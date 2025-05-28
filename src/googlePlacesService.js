export const searchPlaces = async (query) => {
    if (!query.trim()) {
      throw new Error("Por favor, introduce un nombre para buscar.");
    }
  
    try {
      const response = await fetch("http://localhost:3001/api/searchPlaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      });
  

      const data = await response.json();
      console.log(data);
      return data.places || [];
    } catch (error) {
      console.error("Error en la búsqueda de Google Places:", error);
      throw new Error("Hubo un problema al buscar en Google Places.");
    }
  };
  

  export const getPlaceDetails = async (placeId) => {
    if (!placeId) {
      throw new Error("Se requiere un Place ID.");
    }
  
    try {
      const response = await fetch(`http://localhost:3001/api/getPlaceDetails/${placeId}`, {
        method: "GET",  // <-- Asegúrate de que sea GET
        headers: {
          "Content-Type": "application/json"
        }
      });
  
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("Detalles del lugar:", data);
      return data;
    } catch (error) {
      console.error("Error obteniendo detalles del lugar:", error);
      throw new Error("Hubo un problema al obtener los detalles del lugar.");
    }
  };
  