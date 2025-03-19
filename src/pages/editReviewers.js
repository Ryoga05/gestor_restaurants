import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, ListGroup, InputGroup, Pagination } from 'react-bootstrap';
import { db } from "../firebaseConfig";  // Importamos la configuración de Firebase
import { collection, doc, getDocs, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import apiKeys from "../apiKeys"

function EditReviewers() {
  const [view, setView] = useState("ver"); // 'ver' o 'crear'
  return (
    <Container className='mt-5'>
      <h2 className='text-center fw-bold'>REVIEWERS</h2>
      {/* Botones de navegación */}
      <div className="d-flex justify-content-center mt-3">
        <Button variant={view === "ver" ? "primary" : "light"} className="border me-2" onClick={() => setView("ver")}>
          Ver Reviewers
        </Button>
        <Button variant={view === "crear" ? "primary" : "light"} className="border me-2" onClick={() => setView("crear")}>
          Crear Nuevo
        </Button>
      </div>

      {/* Renderiza la vista según el estado */}
      {view === "crear" ? <CreateReviewerForm /> : <ReviewersList />}
    </Container>
  );
};

const ReviewersList = () => {
  const [reviewers, setReviewers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);  // Página actual
  const [itemsPerPage] = useState(1);  // Número de reviewers por página (puedes cambiar este número)
  const [searchTerm, setSearchTerm] = useState(""); // Estado del buscador
  const [channelId, setChannelId] = useState('');
  const [name, setName] = useState("");
  const [web, setWeb] = useState("");
  const [avatarURL, setAvatarURL] = useState("");
  const [lastVideoIDChecked, setLastVideoIDChecked] = useState("");


  useEffect(() => {
    const fetchReviewers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Reviewers"));
        setReviewers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error al obtener los reviewers: ", error);
      }
    };

    fetchReviewers();
  }, []);

  const filteredReviewers = searchTerm
    ? reviewers.filter(reviewer => reviewer.Name.toLowerCase().includes(searchTerm.toLowerCase()))
    : reviewers;

  // Función para obtener los reviewers de la página actual
  const indexOfLastReviewer = currentPage * itemsPerPage;
  const indexOfFirstReviewer = indexOfLastReviewer - itemsPerPage;
  const currentReviewers = filteredReviewers.slice(indexOfFirstReviewer, indexOfLastReviewer);

  // Función para manejar el cambio de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setChannelId("");
    setName("");
    setWeb("");
    setAvatarURL("");
    setLastVideoIDChecked("");
  };

  // Generar el número de páginas
  const totalPages = Math.ceil(filteredReviewers.length / itemsPerPage);
  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
        {number}
      </Pagination.Item>
    );
  }

  const handleWebVisit = (web) => {
    window.open(web, '_blank')
  };

  const updateReviewer = async (id) => {
    try {
      await updateDoc(doc(db, "Reviewers", id), {
        Name: name,
        Web: web,
        AvatarURL: avatarURL || "/default-avatar.png",
        LastVideoIDChecked: lastVideoIDChecked,
      });

      setChannelId("");
      setName("");
      setWeb("");
      setAvatarURL("");
      setLastVideoIDChecked("");
      alert("Reviewer actualizado con exito!")
      
    } catch (error) {
      console.error("Error al actualizar el reviewer: ", error);
    }
  };

  const deleteReviewer = async (id) => {
    try {
      await deleteDoc(doc(db, "Reviewers", id));
      setReviewers(prevReviewers => prevReviewers.filter(reviewer => reviewer.id !== id));
      setChannelId("");
      setName("");
      setWeb("");
      setAvatarURL("");
      setLastVideoIDChecked("");
      alert("Reviewer eliminado con exito!")
    } catch (error) {
      console.error("Error al eliminar el reviewer: ", error);
    }
  };

  return (
    <Card className="mx-auto mt-4 p-4 shadow-sm" style={{ maxWidth: "400px" }}>
      <h5 className="text-center">Lista de Reviewers</h5>
      {/* Buscador */}
      <Form.Group className="mb-3">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Buscar reviewer por nombre..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reiniciar a la primera página cuando se busca
            }}
          />
          {searchTerm && (
            <Button variant="outline-secondary" onClick={() => {
              setSearchTerm(""); // Vaciar el buscador
              setCurrentPage(1); // Reiniciar paginación
            }}>
              ❌
            </Button>
          )}
        </InputGroup>
      </Form.Group>
      <ListGroup>
        {currentReviewers.map(reviewer => (
          <ListGroup.Item key={reviewer.id}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>URL de l'Avatar:</Form.Label>
                <div className="d-flex align-items-center">
                  <Form.Control type="text" 
                  value={avatarURL || reviewer.AvatarURL} // Esto asegura que el valor predeterminado sea el de reviewer
                  onChange={(e) => setAvatarURL(e.target.value)} // Actualiza el estado avatarURL
                  />
                  <img src={avatarURL || reviewer.AvatarURL} alt="avatar" width="40" className="ms-2" onError={(e) => e.target.src = "/User_icon.png"}/>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Últim Vídeo Comprovat:</Form.Label>
                <Form.Control type="text" 
                value={lastVideoIDChecked || reviewer.LastVideoIDChecked} 
                onChange={(e) => setLastVideoIDChecked(e.target.value)} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Nom:</Form.Label>
                <Form.Control type="text" 
                value={name || reviewer.Name}
                onChange={(e) => setName(e.target.value)}/>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Web:</Form.Label>
                <InputGroup>
                  <Form.Control type="text"
                  value={web || reviewer.Web}
                  onChange={(e) => setWeb(e.target.value)}/>
                  <Button variant="light" onClick={() => handleWebVisit(reviewer.Web)} className="border me-2">Visitar web</Button>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Channel ID:</Form.Label>
                <InputGroup>
                  <Form.Control type="text"
                  value={channelId || reviewer.ChannelID}
                  onChange={(e) => setChannelId(e.target.value)}/>
                  <Button variant="light" className="border me-2" disabled>Obtenir Channel ID</Button>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <InputGroup className='justify-content-center'>
                  <Button variant="primary" onClick={() => updateReviewer(reviewer.id)} className="border me-2">Actualizar</Button>
                  <Button variant="danger" onClick={() => deleteReviewer(reviewer.id)} className="border me-2">Eliminar </Button>
                </InputGroup>
              </Form.Group>
            </Form>
          </ListGroup.Item>
        ))}
      </ListGroup>
      {/* Paginación */}
      <Pagination className="mt-4 justify-content-center">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
        {paginationItems}
        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
          <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    </Card>
  );
};

const CreateReviewerForm = () => {
  const [channelId, setChannelId] = useState('');
  const [name, setName] = useState("");
  const [web, setWeb] = useState("");
  const [avatarURL, setAvatarURL] = useState("");
  const [lastVideoIDChecked, setLastVideoIDChecked] = useState("");
  const [error, setError] = useState('');

  const obtenerChannelId = async () => {
    if (!web) {
      setError('Por favor ingrese un nombre de canal válido.');
      return;
    }

    try {
      const handle = web.split("@").pop(); 
      const YOUTUBE_API_KEY = apiKeys.YOUTUBE_API_KEY;
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handle}&key=${YOUTUBE_API_KEY}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const channel = data.items[0];
        setChannelId(channel.id.channelId);
        setError('');
      } else {
        setError('No se encontró un canal con ese nombre.');
      }
    } catch (err) {
      setError('Hubo un error al obtener el Channel ID.');
    }
  };

  const crearReviewer = async () => {
    if (!name || !web || !channelId) {
      setError("Por favor complete todos los campos.");
      return;
    }

    try {
      await addDoc(collection(db, "Reviewers"), {
        AvatarURL: avatarURL || "/default-avatar.png",
        LastVideoIDChecked: lastVideoIDChecked,
        Name: name,
        Web: web,
        ChannelID: channelId,
      });

      // Limpiar formulario después de agregar
      setChannelId("");
      setName("");
      setWeb("");
      setAvatarURL("");
      setLastVideoIDChecked("");
      setError("");
      alert("Reviewer agregado con éxito 🎉");
    } catch (err) {
      setError("Error al guardar en Firebase.");
    }
  };

  return (
    <Card className="mx-auto mt-4 p-4 shadow-sm" style={{ maxWidth: "400px" }}>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>URL de l'Avatar:</Form.Label>
          <div className="d-flex align-items-center">
            <Form.Control type="text" placeholder="" onChange={(e) => setAvatarURL(e.target.value)}/>
            <img src={avatarURL} alt="avatar" width="40" className="ms-2" onError={(e) => e.target.src = "/User_icon.png"} />
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Últim Vídeo Comprovat:</Form.Label>
          <Form.Control type="text" onChange={(e) => setLastVideoIDChecked(e.target.value)}/>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nom:</Form.Label>
          <Form.Control type="text" onChange={(e) => setName(e.target.value)}/>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Web:</Form.Label>
          <Form.Control type="text" placeholder="https://www.youtube.com/@name" onChange={(e) => setWeb(e.target.value)}/>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Channel ID:</Form.Label>
          <InputGroup>
            <Form.Control type="text" value={channelId} onChange={(e) => setChannelId(e.target.value)}/>
            <Button variant="light" className="border me-2" onClick={obtenerChannelId}>Obtenir Channel ID</Button>
          </InputGroup>
          {error && <div className="text-danger mt-2">{error}</div>}
        </Form.Group>

        <Button variant="primary" className="w-100" onClick={crearReviewer}>Crear Nou Reviewer</Button>
      </Form>
    </Card>
  );
};

export default EditReviewers;