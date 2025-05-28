import express from "express";
import axios from "axios";
import cors from "cors";
import apiKeys from "./src/utils/apiKeys.js"; 


const { GOOGLE_CLOUD_API_KEY } = apiKeys;
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json()); // 👈 Permitir JSON en los POST

app.post("/api/searchPlaces", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Se requiere un término de búsqueda" });
    }

    const response = await axios({
      method: "post",
      url: "https://places.googleapis.com/v1/places:searchText",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_CLOUD_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.id"
      },
      data: {
        textQuery: query
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error en Google Places:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Error en la búsqueda de Google Places" });
  }
});

app.get("/api/getPlaceDetails/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;
    console.log("🔍 Recibiendo placeId:", placeId);

    if (!placeId) {
      return res.status(400).json({ error: "Se requiere un Place ID" });
    }

    const response = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_CLOUD_API_KEY,
          "X-Goog-FieldMask": "displayName,formattedAddress,internationalPhoneNumber,googleMapsUri,priceLevel,rating,userRatingCount,location,businessStatus"
        }
      }
    );

    console.log("✅ Respuesta de Google Places v1:", JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error obteniendo detalles del lugar:");

    if (error.response) {
      console.error("📡 Respuesta de Google:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status).json({
        error: "Error al obtener detalles del lugar",
        details: error.response.data
      });
    } else {
      console.error("⚠️ Error inesperado:", error.message);
      return res.status(500).json({ error: "Error inesperado al obtener detalles del lugar", message: error.message });
    }
  }
});



app.listen(PORT, () => {
  console.log(`Servidor proxy corriendo en http://localhost:${PORT}`);
});
