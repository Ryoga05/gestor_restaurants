import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, Pagination, Spinner, Alert, Form, Button } from 'react-bootstrap';
import { searchPlaces, getPlaceDetails } from "../googlePlacesService";

function EditRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [reviewsDocs, setReviewsDocs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [restaurantsPerPage] = useState(1);
  const [temporaryRestaurants, setTemporaryRestaurants] = useState({});
  const [reviewPageIndexes, setReviewPageIndexes] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'Restaurantes'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRestaurants(data);

        const reviewsSnap = await getDocs(collection(db, 'Reviews'));
        setReviewsDocs(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const videosSnap = await getDocs(collection(db, 'VideosToEdit'));
        setVideos(videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const reviewersSnap = await getDocs(collection(db, 'Reviewers'));
        setReviewers(reviewersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
        setError('Error al cargar los restaurantes.');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const filteredRestaurants = searchTerm
  ? restaurants.filter(r =>
      r.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  : restaurants;

  const totalPages = Math.ceil(filteredRestaurants.length / restaurantsPerPage);
  const indexOfLast = currentPage * restaurantsPerPage;
  const indexOfFirst = indexOfLast - restaurantsPerPage;
  const currentRestaurants = filteredRestaurants.slice(indexOfFirst, indexOfLast);

  const paginationItems = [];
  for (let i = 1; i <= totalPages; i++) {
    paginationItems.push(
      <Pagination.Item
        key={i}
        active={i === currentPage}
        onClick={() => setCurrentPage(i)}
      >
        {i}
      </Pagination.Item>
    );
  }
  
  const convertirPriceLevel = (nivel) => {
  switch (nivel) {
    case "PRICE_LEVEL_FREE":
      return 0;
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return 0; // Valor por defecto
  }
};

  const handleTempRestaurantChange = (restaurantId, index, field, value) => {
  setTemporaryRestaurants(prev => {
    const updatedRestaurants = [...(prev[restaurantId] || [])];
    const currentRestaurant = updatedRestaurants[index] || {};
    if (field === "Geopoint") {
      currentRestaurant.Geopoint = value;
    } else {
      currentRestaurant[field] = value;
    }
    updatedRestaurants[index] = currentRestaurant;
    return { ...prev, [restaurantId]: updatedRestaurants };
  });
};

const saveRestaurantToFirebase = async (restaurantId, data) => {
  try {
    await updateDoc(doc(db, "Restaurantes", restaurantId), data);
    setError(""); // Limpia errores previos
    // Opcional: recarga los restaurantes o muestra un mensaje de éxito
  } catch (err) {
    setError("Error al guardar los cambios en Firebase.");
  }
};

const deleteRestaurantFromFirebase = async (restaurantId) => {
  if (!window.confirm("¿Seguro que quieres eliminar este restaurante?")) return;
  try {
    await deleteDoc(doc(db, "Restaurantes", restaurantId));
    setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
    setError("");
  } catch (err) {
    setError("Error al eliminar el restaurante.");
  }
};

const deleteReviewFromRestaurant = async (restaurantId, reviewIndex) => {
  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (!restaurant) return;
  if (!window.confirm("¿Seguro que quieres eliminar esta review del restaurante?")) return;

  // Elimina la review del array localmente
  const updatedReviews = [...(restaurant.Reviews || [])];
  updatedReviews.splice(reviewIndex, 1);

  try {
    await updateDoc(doc(db, "Restaurantes", restaurantId), {
      Reviews: updatedReviews
    });
    setRestaurants(prev =>
      prev.map(r =>
        r.id === restaurantId ? { ...r, Reviews: updatedReviews } : r
      )
    );
    setError("");
  } catch (err) {
    setError("Error al eliminar la review del restaurante.");
  }
};

const changeReviewPage = (restaurantId, action, total = null) => {
  setReviewPageIndexes(prev => {
    const current = prev[restaurantId] || 0;
    const totalReviews = total ?? (restaurants.find(r => r.id === restaurantId)?.Reviews?.length || 0);
    let newIndex = current;

    if (action === "first") newIndex = 0;
    else if (action === "last") newIndex = totalReviews - 1;
    else if (action === "next") newIndex = Math.min(totalReviews - 1, current + 1);
    else if (action === "prev") newIndex = Math.max(0, current - 1);
    else if (typeof action === "number") newIndex = Math.max(0, Math.min(totalReviews - 1, action));

    return { ...prev, [restaurantId]: newIndex };
  });
};

  return (
    <Card className="mx-auto mt-4 p-4 shadow-sm" style={{ maxWidth: '800px' }}>
      <h5 className="text-center">Lista de Restaurantes</h5>
      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder="Buscar restaurante por nombre..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        {searchTerm && (
          <Button
            variant="outline-secondary"
            className="mt-2"
            onClick={() => {
              setSearchTerm("");
              setCurrentPage(1);
            }}
          >
            ❌
          </Button>
        )}
      </Form.Group>
      <Pagination className="mt-4 justify-content-center">
      <Pagination.First
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
      />
      <Pagination.Prev
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
      />
      {paginationItems}
      <Pagination.Next
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
      />
      <Pagination.Last
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
      />
    </Pagination>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          {currentRestaurants.map((restaurant, realIdx) => {
            const tempRestaurant = temporaryRestaurants[restaurant.id]?.[realIdx] || {};

            return (
              
              <Card key={realIdx} className="mb-4 p-3 border">
                {/* Formulario de edición */}
                <Form.Group className="mb-2">
                  <Form.Label>Google Place ID</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      value={restaurant.GooglePlaceID || ""}
                      onChange={(e) =>
                        handleTempRestaurantChange(restaurant.id, realIdx, "GooglePlaceID", e.target.value)
                      }
                    />
                    <Button
                      onClick={async () => {
                        try {
                          const data = await getPlaceDetails(restaurant.GooglePlaceID);
                          console.log("Google Place Details:", data); // <-- Log aquí
                          const result = {
                            Name: data.displayName.text || "",
                            Address: data.formattedAddress || "",
                            Phone: data.internationalPhoneNumber || "",
                            Rating: data.rating || 0,
                            UserRatingsTotal: data.userRatingCount || 0,
                            PriceLevel: convertirPriceLevel(data.priceLevel) || 0,
                            Website: data.website || "",
                            GoogleMapsUrl: data.googleMapsUri || "",
                            Geopoint: {
                              Latitude: data.location?.latitude || 0,
                              Longitude: data.location?.longitude || 0,
                            },
                            BusinessStatus: data.businessStatus || "",
                          };

                          const nuevasRestaurants = [...(temporaryRestaurants[restaurant.id] || [])];
                          nuevasRestaurants[realIdx] = {
                            ...(nuevasRestaurants[realIdx] || {}),
                            ...result,
                          };

                          setTemporaryRestaurants(prev => ({
                            ...prev,
                            [restaurant.id]: nuevasRestaurants,
                          }));
                        } catch (err) {
                          console.error("Error al obtener detalles:", err);
                          setError("Error al obtener detalles del lugar.");
                        }
                      }}
                    >
                      Obtener detalles desde Google
                    </Button>
                  </div>
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.Name !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].Name
                        : restaurant.Name || ""
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "Name", e.target.value)
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Dirección</Form.Label>
                  <Form.Control
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.Address !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].Address
                        : restaurant.Address || ""
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "Address", e.target.value)
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.Phone !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].Phone
                        : restaurant.Phone || ""
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "Phone", e.target.value)
                    }
                  />
                </Form.Group>
                
                <Form.Group className="mb-2">
                  <Form.Label>Google Maps URL</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      value={
                        (temporaryRestaurants[restaurant.id]?.[realIdx]?.GoogleMapsUrl !== undefined)
                          ? temporaryRestaurants[restaurant.id][realIdx].GoogleMapsUrl
                          : restaurant.GoogleMapsUrl || ""
                      }
                      onChange={e =>
                        handleTempRestaurantChange(restaurant.id, realIdx, "GoogleMapsUrl", e.target.value)
                      }
                    />
                    <Button
                      variant="outline-primary"
                      disabled={
                        !(
                          (temporaryRestaurants[restaurant.id]?.[realIdx]?.GoogleMapsUrl !== undefined
                            ? temporaryRestaurants[restaurant.id][realIdx].GoogleMapsUrl
                            : restaurant.GoogleMapsUrl
                          )
                        )
                      }
                      onClick={() => {
                        const url = (
                          temporaryRestaurants[restaurant.id]?.[realIdx]?.GoogleMapsUrl !== undefined
                            ? temporaryRestaurants[restaurant.id][realIdx].GoogleMapsUrl
                            : restaurant.GoogleMapsUrl
                        );
                        window.open(
                          url.startsWith("http") ? url : `https://${url}`,
                          "_blank"
                        );
                      }}
                    >
                      Visitar Web {'>'}
                    </Button>
                  </div>
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Rating</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.Rating !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].Rating
                        : restaurant.Rating || 0
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "Rating", parseFloat(e.target.value))
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Cantidad de reviews</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.UserRatingsTotal !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].UserRatingsTotal
                        : restaurant.UserRatingsTotal || 0
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "UserRatingsTotal", parseInt(e.target.value))
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Price Level</Form.Label>
                  <Form.Control
                    type="number"
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.PriceLevel !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].PriceLevel
                        : restaurant.PriceLevel || 0
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "PriceLevel", Number(e.target.value))
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Latitud</Form.Label>
                  <Form.Control
                    type="number"
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.Geopoint?.Latitude !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].Geopoint.Latitude
                        : restaurant.Geopoint?.Latitude || 0
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "Geopoint", {
                        ...(temporaryRestaurants[restaurant.id]?.[realIdx]?.Geopoint || restaurant.Geopoint || {}),
                        Latitude: parseFloat(e.target.value),
                      })
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Longitud</Form.Label>
                  <Form.Control
                    type="number"
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.Geopoint?.Longitude !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].Geopoint.Longitude
                        : restaurant.Geopoint?.Longitude || 0
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "Geopoint", {
                        ...(temporaryRestaurants[restaurant.id]?.[realIdx]?.Geopoint || restaurant.Geopoint || {}),
                        Longitude: parseFloat(e.target.value),
                      })
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Estado del restaurante</Form.Label>
                  <Form.Control
                    value={
                      (temporaryRestaurants[restaurant.id]?.[realIdx]?.BusinessStatus !== undefined)
                        ? temporaryRestaurants[restaurant.id][realIdx].BusinessStatus
                        : restaurant.BusinessStatus || ""
                    }
                    onChange={e =>
                      handleTempRestaurantChange(restaurant.id, realIdx, "BusinessStatus", e.target.value)
                    }
                  />
                </Form.Group>

               <Button
                  className="text-center mb-4"
                  onClick={() => saveRestaurantToFirebase(
                    restaurant.id,
                    {
                      ...restaurant,
                      ...(temporaryRestaurants[restaurant.id]?.[realIdx] || {})
                    }
                  )}
                >
                  Guardar cambios
                </Button>

                <Button
                  variant="danger"
                  className="mb-4 ms-2"
                  onClick={() => deleteRestaurantFromFirebase(restaurant.id)}
                >
                  Eliminar restaurante
                </Button>

                <Form.Group className="mb-2">
                  <Form.Label>Reviews asociadas</Form.Label>
                  <ul>
                    {(() => {
                      const reviewsArr = restaurant.Reviews || [];
                      const pageIndex = reviewPageIndexes[restaurant.id] || 0;
                      const rev = reviewsArr[pageIndex];
                      if (!rev) return <li>No hay reviews.</li>;

                      const reviewDoc = reviewsDocs.find(r => r.id === rev.ReviewId);
                      const video = videos.find(v => v.id === reviewDoc?.videoId);
                      const reviewer = reviewers.find(r => r.id === reviewDoc?.channelId);

                      return (
                        <li className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <img
                              src={reviewer?.AvatarURL || "/User_icon.png"}
                              alt="Avatar"
                              width="40"
                              height="40"
                              className="rounded-circle me-2"
                              onError={e => (e.target.src = "/User_icon.png")}
                            />
                            <div>
                              <div><strong>{reviewer?.Name || "Canal desconocido"}</strong></div>
                              {reviewer && (
                                <a
                                  href={reviewer.Web || `https://www.youtube.com/channel/${reviewer.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Visitar página
                                </a>
                              )}
                            </div>
                          </div>
                          <div>
                            <strong>Título:</strong> {reviewDoc?.title || "Sin título"}
                          </div>
                          <div>
                            <strong>Fecha:</strong>{" "}
                            {reviewDoc?.publishedAt
                              ? new Date(reviewDoc.publishedAt).toLocaleString()
                              : "Sin fecha"}
                          </div>
                          <div className="mt-2">
                            {reviewDoc?.videoId && (
                              <iframe
                                width="100%"
                                height="200"
                                src={`https://www.youtube.com/embed/${reviewDoc.videoId}`}
                                title={reviewDoc.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            )}
                          </div>
                          <div>
                            <strong>Segundo de inicio:</strong> {rev.Start}
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            className="mt-2"
                            onClick={() => deleteReviewFromRestaurant(restaurant.id, pageIndex)}
                          >
                            Eliminar review
                          </Button>
                        </li>
                      );
                    })()}
                  </ul>
                  {/* PAGINACIÓN INTERNA DE REVIEWS */}
                  <Pagination className="mt-3 justify-content-center">
                    <Pagination.First
                      onClick={() => changeReviewPage(restaurant.id, "first")}
                      disabled={(reviewPageIndexes[restaurant.id] || 0) === 0}
                    />
                    <Pagination.Prev
                      onClick={() => changeReviewPage(restaurant.id, "prev")}
                      disabled={(reviewPageIndexes[restaurant.id] || 0) === 0}
                    />
                    {(restaurant.Reviews || []).map((_, i) => (
                      <Pagination.Item
                        key={i}
                        active={i === (reviewPageIndexes[restaurant.id] || 0)}
                        onClick={() => changeReviewPage(restaurant.id, i)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      onClick={() => changeReviewPage(restaurant.id, "next")}
                      disabled={(reviewPageIndexes[restaurant.id] || 0) >= (restaurant.Reviews?.length - 1)}
                    />
                    <Pagination.Last
                      onClick={() => changeReviewPage(restaurant.id, "last", restaurant.Reviews?.length)}
                      disabled={(reviewPageIndexes[restaurant.id] || 0) >= (restaurant.Reviews?.length - 1)}
                    />
                  </Pagination>
                </Form.Group>                
              </Card>
            );
          })}


          <Pagination className="mt-4 justify-content-center">
            <Pagination.First
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            />
            {paginationItems}
            <Pagination.Next
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            />
            <Pagination.Last
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </>
      )}
    </Card>
  );
}

export default EditRestaurants;
