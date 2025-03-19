import React from 'react';
import { Box, Heading, Button } from '@chakra-ui/react';

function EditRestaurants() {
  return (
    <Box textAlign="center" py={10} px={6}>
      <Heading mb={6}>Bienvenido a Restaurantes Visitados por Youtubers</Heading>
      <Button colorScheme="teal" size="lg">Ver Restaurantes</Button>
    </Box>
  );
}

export default EditRestaurants;