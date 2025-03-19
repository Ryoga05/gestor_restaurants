import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, ListGroup, InputGroup, Pagination } from 'react-bootstrap';
import { db } from "../firebaseConfig";  // Importamos la configuración de Firebase
import { collection, getDocs, addDoc } from "firebase/firestore";
import YOUTUBE_API_KEY from "../apiKeys"

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

  // Función para obtener los reviewers de la página actual
  const indexOfLastReviewer = currentPage * itemsPerPage;
  const indexOfFirstReviewer = indexOfLastReviewer - itemsPerPage;
  const currentReviewers = reviewers.slice(indexOfFirstReviewer, indexOfLastReviewer);

  // Función para manejar el cambio de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Generar el número de páginas
  const totalPages = Math.ceil(reviewers.length / itemsPerPage);
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

  return (
    <Card className="mx-auto mt-4 p-4 shadow-sm" style={{ maxWidth: "400px" }}>
      <h5 className="text-center">Lista de Reviewers</h5>
      <ListGroup>
        {currentReviewers.map(reviewer => (
          <ListGroup.Item key={reviewer.id}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>URL de l'Avatar:</Form.Label>
                <div className="d-flex align-items-center">
                  <Form.Control type="text" value={reviewer.AvatarURL} readOnly />
                  <img src={reviewer.AvatarURL || "/User_icon.png"} alt="avatar" width="40" className="ms-2"/>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Últim Vídeo Comprovat:</Form.Label>
                <Form.Control type="text" value={reviewer.LastVideoIDChecked} readOnly />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Nom:</Form.Label>
                <Form.Control type="text" value={reviewer.Name} onChange={setName} readOnly/>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Web:</Form.Label>
                <InputGroup>
                  <Form.Control type="text" value={reviewer.Web} readOnly/>
                  <Button variant="light" onClick={() => handleWebVisit(reviewer.Web)} className="border me-2">Visitar web</Button>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Channel ID:</Form.Label>
                <InputGroup>
                  <Form.Control type="text" value={reviewer.id} readOnly/>
                  <Button variant="light" className="border me-2" disabled>Obtenir Channel ID</Button>
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
  const [handle, setHandle] = useState('');
  const [channelId, setChannelId] = useState('');
  const [name, setName] = useState("");
  const [web, setWeb] = useState("");
  const [avatarURL, setAvatarURL] = useState("");
  const [lastVideoIDChecked, setLastVideoIDChecked] = useState("");
  const [error, setError] = useState('');

  const obtenerChannelId = async () => {
    if (!handle) {
      setError('Por favor ingrese un nombre de canal válido.');
      return;
    }

    try {
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
        Name: name,
        Web: web,
        AvatarURL: avatarURL || "/default-avatar.png",
        ChannelID: channelId,
        LastVideoIDChecked: lastVideoIDChecked,
      });

      // Limpiar formulario después de agregar
      setHandle("");
      setChannelId("");
      setName("");
      setWeb("");
      setAvatarURL("");
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
            <Form.Control type="text" placeholder="" />
            <img src="/User_icon.png" alt="avatar" width="40" className="ms-2"/>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Últim Vídeo Comprovat:</Form.Label>
          <Form.Control type="text" />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nom:</Form.Label>
          <Form.Control type="text" />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Web:</Form.Label>
          <InputGroup>
            <Form.Control type="text" placeholder="https://www.youtube.com/@name" onChange={(e) => setHandle(e.target.value)}/>
            <Button variant="light" className="border me-2">Visitar web</Button>
          </InputGroup>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Channel ID:</Form.Label>
          <InputGroup>
            <Form.Control type="text" value={channelId} readOnly/>
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