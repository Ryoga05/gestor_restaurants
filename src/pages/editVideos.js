import React, { useState, useEffect } from 'react';
import { Card, Form, ListGroup, InputGroup, Pagination, Alert, Spinner, Button } from 'react-bootstrap';
import { db } from "../firebaseConfig";
import { collection, doc, updateDoc, getDocs, getDoc, setDoc, GeoPoint, addDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { searchPlaces, getPlaceDetails } from "../googlePlacesService";

function EditVideos() {
  const [videos, setVideos] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [temporaryReviews, setTemporaryReviews] = useState({});
  const [queries, setQueries] = useState({});

  const [googlePlacesResults, setGooglePlacesResults] = useState({});;

  useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "VideosToEdit"),
    async (videoSnapshot) => {
      try {
        const reviewerSnapshot = await getDocs(collection(db, "Reviewers"));

        const videoList = videoSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          tempReviews: (doc.data().Reviews || []).map(r => ({ ...r })),
          reviewPageIndex: 0
        }));

        const tempReviewsObj = {};
        videoList.forEach(video => {
          tempReviewsObj[video.id] = (video.Reviews || []).map(r => ({
            ...r,
          }));
        });

        const reviewerList = reviewerSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setVideos(videoList);
        setTemporaryReviews(tempReviewsObj);
        setReviewers(reviewerList);
        setLoading(false);
      } catch (err) {
        console.error("Error al obtener los datos: ", err);
        setError("Error al cargar los videos o reviewers.");
        setLoading(false);
      }
    }
  );

  return () => unsubscribe(); // Muy importante: cancelar suscripción cuando se desmonte
}, []);

  const filteredVideos = searchTerm
    ? videos.filter(video => video.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    : videos;

  const indexOfLastVideo = currentPage * itemsPerPage;
  const indexOfFirstVideo = indexOfLastVideo - itemsPerPage;
  const currentVideos = filteredVideos.slice(indexOfFirstVideo, indexOfLastVideo);

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item
        key={number}
        active={number === currentPage}
        onClick={() => setCurrentPage(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  const handleAddTempReview = (videoId) => {
  const newReview = {
    Start: 0,
    Address: "",
    BusinessStatus: "",
    CoverImageUrl: "",
    Geopoint: {
    Latitude: 0,
    Longitude: 0
  },
    Name: "",
    Phone: "",
    PlaceId: "",
    PriceLevel: 0,
    Rating: 0,
    TripAdvisorUrl: "",
    GoogleMapsUrl: "",
    UserRatingsTotal: 0,
    Website: ""
  };

  setTemporaryReviews(prev => ({
    ...prev,
    [videoId]: [...(prev[videoId] || []), newReview]
  }));

  setVideos(prevVideos =>
    prevVideos.map(v =>
      v.id === videoId
        ? { ...v, reviewPageIndex: (v.reviewPageIndex || 0) + 1 }
        : v
    )
  );
};

const handleDeleteTempReview = (videoId, indexToDelete) => {
  setTemporaryReviews((prev) => {
    const currentReviews = prev[videoId] || [];
    const updatedReviews = currentReviews.filter((_, idx) => idx !== indexToDelete);

    return {
      ...prev,
      [videoId]: updatedReviews,
    };
  });
};



const handleTempReviewChange = (videoId, reviewIdx, field, value) => {
  setTemporaryReviews((prev) => {
    const updated = [...(prev[videoId] || [])];
    updated[reviewIdx] = {
      ...updated[reviewIdx],
      [field]: value,
    };
    return {
      ...prev,
      [videoId]: updated,
    };
  });
};




  const changeReviewPage = (videoId, action, total = null) => {
  setVideos(prev =>
    prev.map(video => {
      if (video.id !== videoId) return video;

      const totalReviews = total ?? (temporaryReviews[videoId]?.length || 0);
      let newIndex = video.reviewPageIndex || 0;

      if (action === "first") {
        newIndex = 0;
      } else if (action === "last") {
        newIndex = totalReviews - 1;
      } else if (action === "next") {
        newIndex = Math.min(totalReviews - 1, newIndex + 1);
      } else if (action === "prev") {
        newIndex = Math.max(0, newIndex - 1);
      } else if (typeof action === "number") {
        // Esto lo tratamos siempre como índice directo
        newIndex = Math.max(0, Math.min(totalReviews - 1, action));
      }

      return { ...video, reviewPageIndex: newIndex };
    })
  );
};

const getQuery = (videoId, reviewIdx) =>
  queries[videoId]?.[reviewIdx] || "";

const handleSearch = async (videoId, reviewIdx) => {
  const query = queries[videoId]?.[reviewIdx] || "";
  try {
    const places = await searchPlaces(query);
    setGooglePlacesResults((prev) => ({
      ...prev,
      [videoId]: {
        ...(prev[videoId] || {}),
        [reviewIdx]: places,
      },
    }));
    setError(null);
  } catch (err) {
    setError(err.message);
    setGooglePlacesResults((prev) => ({
      ...prev,
      [videoId]: {
        ...(prev[videoId] || {}),
        [reviewIdx]: [],
      },
    }));
  }
};

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


const saveTemporaryReviewsToFirebase = async (videoId, tempReviews) => {
  try {
    const reviewsToSave = tempReviews
  .map(review => {
    const {
      Start,
      PriceLevel,
      Rating,
      UserRatingsTotal,
      Geopoint,
      ...rest
    } = review;

    return {
      ...rest,
      Start: Number(Start) || 0,
      PriceLevel: convertirPriceLevel(review.PriceLevel),
      Rating: Number(Rating) || 0,
      UserRatingsTotal: Number(UserRatingsTotal) || 0,
      Geopoint: {
        Latitude: Number(Geopoint?.Latitude) || 0,
        Longitude: Number(Geopoint?.Longitude) || 0
      }
    };
  });

    const videoRef = doc(db, "VideosToEdit", videoId);
    await updateDoc(videoRef, {
      Reviews: reviewsToSave,
    });

    console.log("Reviews guardadas correctamente en Firebase.");
    console.log("Guardando review:", reviewsToSave);
  } catch (error) {
    console.error("Error al guardar las reviews en Firebase:", error);
  }
};

const procesarReviewsDesdeVideo = async (video) => {
  try {
    const reviews = video.tempReviews || [];
      for (const review of reviews) {
        const placeId = review.PlaceId;
        if (!placeId) continue;

        const restauranteDocRef = doc(db, "Restaurantes", placeId);
        const docSnapshot = await getDoc(restauranteDocRef);

        const nuevaReview = {
          ...review,
          PriceLevel: Number(review.PriceLevel) || 0,
          Rating: Number(review.Rating) || 0,
          UserRatingsTotal: Number(review.UserRatingsTotal) || 0,
          Start: Number(review.Start) || 0,
          Geopoint: review.Geopoint
            ? new GeoPoint(review.Geopoint.Latitude, review.Geopoint.Longitude)
            : null,
        };

        // 👇 Crear la entrada en la colección "Reviews" y obtener el ID del nuevo documento
        const reviewDoc = {
          channelId: video.channelId,
          publishedAt: video.publishedAt,
          title: video.title,
          type: video.type,
          videoId: video.videoId,
        };

        const newReviewRef = await addDoc(collection(db, "Reviews"), reviewDoc);
        const reviewResumen = {
          Start: nuevaReview.Start,
          ReviewId: newReviewRef.id,
        };

        if (!docSnapshot.exists()) {
          // Crear restaurante con todos los datos si no existe
          await setDoc(restauranteDocRef, {
            GooglePlaceID: placeId,
            Address: review.Address || "",
            BusinessStatus: review.BusinessStatus || "",
            CoverImage: review.CoverImageURL || "",
            Geopoint: review.Geopoint,
            PriceLevel: review.PriceLevel,
            Rating: review.Rating,
            UserRatingsTotal: review.UserRatingsTotal,
            GoogleMapsUrl: review.GoogleMapsUrl || "",
            Name: review.Name || "",
            Phone: review.Phone || "",
            TripAdvisorUrl: review.TripAdvisorUrl || "",
            Website: review.Website || "",
            Reviews: [reviewResumen],
          });
        } else {
          const data = docSnapshot.data();
          const existingReviews = data.Reviews || [];

          const isDuplicate = existingReviews.some(r => r.Start === reviewResumen.Start);

          if (!isDuplicate) {
            await updateDoc(restauranteDocRef, {
              Reviews: [...existingReviews, reviewResumen],
            });
        }
      }
      // ✅ Eliminar la entrada de VideosToEdit
      eliminarVideoDeVideosToEdit(video.id);
    }

    alert("Restaurantes y reviews guardados correctamente.");
  } catch (err) {
    console.error("Error al guardar restaurantes: ", err);
    alert("Hubo un error al guardar los restaurantes.");
  }
};

const eliminarVideoDeVideosToEdit = async (videoId) => {
  try {
    const videoToEditRef = doc(db, "VideosToEdit", videoId);
    await deleteDoc(videoToEditRef);
  } catch (error) {
    console.error(`Error al eliminar video ${videoId} de VideosToEdit:`, error);
  }
};



  return (
    <Card className="mx-auto mt-4 p-4 shadow-sm" style={{ maxWidth: "800px" }}>
      <h5 className="text-center">Lista de Videos para editar</h5>

      <Form.Group className="mb-3">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Buscar video por título..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              ❌
            </button>
          )}
        </InputGroup>
      </Form.Group>

      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}

      <Pagination className="mt-4 justify-content-center">
        <Pagination.First
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        />
        {paginationItems}
        <Pagination.Next
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
        <Pagination.Last
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        />
      </Pagination>

      <ListGroup>
      {currentVideos.map((video) => {
        const reviewer = reviewers.find(r => r.id === video.channelId);

        return (
          <ListGroup.Item key={video.id}>
            <div className="d-flex align-items-center mb-3">
              <img
                src={reviewer?.AvatarURL || "/User_icon.png"}
                alt="Avatar"
                width="40"
                height="40"
                className="rounded-circle me-2"
                onError={(e) => (e.target.src = "/User_icon.png")}
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
              <strong>Título:</strong> {video.title || "Sin título"}
            </div>
            <div>
              <strong>Fecha:</strong>{" "}
              {video.publishedAt
                ? new Date(video.publishedAt).toLocaleString()
                : "Sin fecha"}
            </div>

            <div className="mt-2">
              <iframe
                width="100%"
                height="315"
                src={`https://www.youtube.com/embed/${video.videoId}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            
            <div className="d-flex justify-content-between align-items-center mt-3">
              <h6 className="mb-0">Restaurantes añadidos</h6>
              <button
                className="btn btn-primary btn-sm mb-2"
                onClick={() => handleAddTempReview(video.id)}
              >
                Añadir restaurante
              </button>
            </div>

            {temporaryReviews[video.id]?.length === 0 ? (
              <p>No hay reseñas.</p>
            ) : (
              <>
                {(temporaryReviews[video.id] || [])
                  .slice(video.reviewPageIndex || 0, (video.reviewPageIndex || 0) + 1)
                  .map((review, localIdx) => {
                    const realIdx = (video.reviewPageIndex || 0) + localIdx;

                    return (
                      <div key={`${video.id}-review-${realIdx}`} className="border p-3 mb-3 rounded">
                        <Form.Group className="mb-2">
                          <Form.Label>Segundo en el que empieza la review</Form.Label>
                          <Form.Control
                            type="number"
                            value={review.Start || 0}
                            onChange={(e) => handleTempReviewChange(video.id, realIdx, "Start", Number(e.target.value))}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Buscar restaurante por nombre</Form.Label>

                          {/* Input + botón */}
                          <div className="d-flex gap-2">
                            <Form.Control
                              type="text"
                              value={getQuery(video.id, realIdx)}
                              placeholder="Ej: McDonald's Madrid"
                              onChange={(e) => {
                                setQueries((prev) => ({
                                  ...prev,
                                  [video.id]: {
                                    ...(prev[video.id] || {}),
                                    [realIdx]: e.target.value,
                                  },
                                }));
                              }}
                            />
                            <Button variant="primary" onClick={() => handleSearch(video.id, realIdx)}>
                              Buscar en GooglePlace
                            </Button>
                          </div>

                          {/* Resultados */}
                          <div className="mt-2">
                            {googlePlacesResults[video.id]?.[realIdx]?.map((place) => (
                              <div
                                key={place.id}
                                className="border rounded p-2 mb-2"
                                style={{ cursor: 'pointer', background: '#f8f9fa' }}
                                onClick={() => {
                                  // Actualizar la review seleccionada
                                  const nuevasReviews = [...(temporaryReviews[video.id] || [])];
                                  nuevasReviews[realIdx] = {
                                    ...(nuevasReviews[realIdx] || {}),
                                    Name: place.displayName?.text || '',
                                    Address: place.formattedAddress || '',
                                    PlaceId: place.id,
                                  };
                                  setTemporaryReviews((prev) => ({
                                    ...prev,
                                    [video.id]: nuevasReviews,
                                  }));

                                  // Limpiar resultados (ocultar el resto)
                                  setGooglePlacesResults((prev) => ({
                                    ...prev,
                                    [video.id]: {
                                      ...(prev[video.id] || {}),
                                      [realIdx]: [],
                                    },
                                  }));
                                }}
                              >
                                <strong>{place.displayName?.text}</strong><br />
                                <small>{place.formattedAddress}</small>
                              </div>
                            ))}
                          </div>

                          {error && <div className="text-danger mt-2">{error}</div>}
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Google Place ID</Form.Label>
                          <div className="d-flex gap-2">
                            <Form.Control
                              type='text'
                              value={review.PlaceId || ""}
                              onChange={(e) => handleTempReviewChange(video.id, realIdx, "PlaceId", e.target.value)}
                            />
                            <Button onClick={async () => {
                              try {
                                const data = await getPlaceDetails(review.PlaceId);

                                const result = {
                                  Address: data.formattedAddress || "",
                                  Phone: data.internationalPhoneNumber || "",
                                  Rating: data.rating || 0,
                                  UserRatingsTotal: data.userRatingCount || 0,
                                  PriceLevel: data.priceLevel || 0,
                                  Website: data.website || "",
                                  GoogleMapsUrl: data.googleMapsUri || "",
                                  Geopoint: {
                                    Latitude: data.location?.latitude || 0,
                                    Longitude: data.location?.longitude || 0,
                                  },
                                  BusinessStatus: data.businessStatus || "",
                                };

                                // Actualizar la review temporal
                                const nuevasReviews = [...(temporaryReviews[video.id] || [])];
                                nuevasReviews[realIdx] = {
                                  ...(nuevasReviews[realIdx] || {}),  // Mantén los campos anteriores
                                  ...result,                          // Sobrescribe solo los que vienen desde Google
                                };

                                setTemporaryReviews((prev) => ({
                                  ...prev,
                                  [video.id]: nuevasReviews,
                                }));

                              } catch (err) {
                                console.error("Error al obtener detalles:", err);
                                setError("Error al obtener detalles del lugar.");
                              }
                            }}>
                              Obtener detalles desde Google
                            </Button>
                          </div>
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Nombre del restaurante</Form.Label>
                          <Form.Control
                            value={review.Name || ""}
                            onChange={(e) => handleTempReviewChange(video.id, realIdx, "Name", e.target.value)}
                          />
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Dirección del restaurante</Form.Label>
                          <Form.Control
                            value={review.Address || ""}
                            onChange={(e) => handleTempReviewChange(video.id, realIdx, "Address", e.target.value)}
                          />
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Telefono del restaurante</Form.Label>
                          <Form.Control
                            type="text"
                            value={review.Phone || ""}
                            onChange={(e) => handleTempReviewChange(video.id, realIdx, "Phone", e.target.value)}
                          />
                        </Form.Group>
                        
                        {/* Google Maps */}
                        <Form.Group className="mb-2">
                          <Form.Label>Ficha en Google Maps</Form.Label>
                          <div className="d-flex gap-2">
                            <Form.Control
                              value={review.GoogleMapsUrl || ""}
                              onChange={(e) =>
                                handleTempReviewChange(
                                  video.id,
                                  realIdx,
                                  "GoogleMapsUrl",
                                  e.target.value
                                )
                              }
                            />
                            <Button
                              variant="outline-primary"
                              className="px-4 py-2 fs-5"
                              disabled={!review.GoogleMapsUrl}
                              onClick={() => {
                                const url = review.GoogleMapsUrl.startsWith("http")
                                  ? review.GoogleMapsUrl
                                  : `https://${review.GoogleMapsUrl}`;
                                window.open(url, "_blank");
                              }}
                            >
                              Visitar Web {'>'}
                            </Button>
                          </div>
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Rating de Google Maps</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={review.Rating || 0}
                              onChange={(e) => handleTempReviewChange(video.id, realIdx, "Rating", parseFloat(e.target.value))}
                            />
                          <Form.Label>Cantidad de reviews</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              value={review.UserRatingsTotal || 0}
                              onChange={(e) => handleTempReviewChange(video.id, realIdx, "UserRatingsTotal", parseInt(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Price Level en Google Maps</Form.Label>
                          <Form.Control
                            type='number'
                            value={review.PriceLevel || 0}
                            onChange={(e) => handleTempReviewChange(video.id, realIdx, "PriceLevel", Number(e.target.value))}
                          />
                        </Form.Group>    

                        <Form.Group className="mb-2">
                          <Form.Label>Latitud</Form.Label>
                          <Form.Control
                            type="number"
                            value={review.Geopoint?.Latitude || 0}
                            onChange={(e) =>
                              handleTempReviewChange(
                                video.id,
                                realIdx,
                                "Geopoint",
                                {
                                  ...review.Geopoint,
                                  Latitude: parseFloat(e.target.value),
                                }
                              )
                            }
                          />
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Longitud</Form.Label>
                          <Form.Control
                            type="number"
                            value={review.Geopoint?.Longitude || 0}
                            onChange={(e) =>
                              handleTempReviewChange(
                                video.id,
                                realIdx,
                                "Geopoint",
                                {
                                  ...review.Geopoint,
                                  Longitude: parseFloat(e.target.value),
                                }
                              )
                            }
                          />
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Estado del restaurante</Form.Label>
                          <Form.Control
                            value={review.BusinessStatus || ""}
                            onChange={(e) => handleTempReviewChange(video.id, realIdx, "BusinessStatus", e.target.value)}
                          />
                        </Form.Group>

                        {/* ...otros campos */}

                        <div className="d-flex justify-content-center mt-3">
                          <Button
                            variant="danger"
                            onClick={() => handleDeleteTempReview(video.id, realIdx)}
                          >
                            Eliminar reseña
                          </Button>
                        </div>
                      </div>
                    );
                  })}



                {/* PAGINACIÓN INTERNA DE REVIEWS */}
                <Pagination className="mt-3 justify-content-center">
                  <Pagination.First
                    onClick={() => changeReviewPage(video.id, "first")}
                    disabled={video.reviewPageIndex === 0}
                  />
                  <Pagination.Prev
                    onClick={() => changeReviewPage(video.id, "prev")}
                    disabled={video.reviewPageIndex === 0}
                  />
                  {[...Array(temporaryReviews[video.id]?.length || 0)].map((_, i) => (
                    <Pagination.Item
                      key={i}
                      active={i === video.reviewPageIndex}
                      onClick={() => changeReviewPage(video.id, i)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    onClick={() => changeReviewPage(video.id, "next")}
                    disabled={video.reviewPageIndex >= (temporaryReviews[video.id]?.length - 1)}
                  />
                  <Pagination.Last
                    onClick={() => changeReviewPage(video.id, "last", temporaryReviews[video.id]?.length)}
                    disabled={video.reviewPageIndex >= (temporaryReviews[video.id]?.length - 1)}
                  />
                </Pagination>
              </>
            )}
            <div className="text-center mb-4">
              <Button onClick={() => saveTemporaryReviewsToFirebase(video.id, temporaryReviews[video.id])}>
                Guardar Reviews en Video
              </Button>
            </div>
            <div className="text-center mb-4">
              <Button onClick={() => procesarReviewsDesdeVideo(video)}>
                VOLCAR INFORMACIÓN
              </Button>
            </div>
            <div className="text-center mb-4">
              <Button variant="danger" onClick={() => eliminarVideoDeVideosToEdit(video.id)}>
                Eliminar video
              </Button>
            </div>
          </ListGroup.Item>
        );
      })}
    </ListGroup>

      <Pagination className="mt-4 justify-content-center">
        <Pagination.First
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        />
        {paginationItems}
        <Pagination.Next
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
        <Pagination.Last
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        />
      </Pagination>
    </Card>
  );
}

export default EditVideos;
