document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const suggestionTags = document.querySelectorAll('.suggestion-tag');

  // Procesar y enviar la búsqueda
  const executeSearch = (term) => {
    const cleanTerm = term.trim();
    
    // Ocultar mensaje de error anterior
    errorMessage.classList.add('hidden');
    
    if (cleanTerm === '') {
      showError('Por favor, escribe el nombre de un videojuego válido.');
      return;
    }

    try {
      // Guardar de forma segura en localStorage
      localStorage.setItem('gamerdex_search_term', cleanTerm);
      // Redirigir a la página de detalles
      window.location.href = 'game-details.html';
    } catch (e) {
      console.error('Error al acceder al localStorage:', e);
      showError('Hubo un problema de almacenamiento en tu navegador. Por favor, habilita las cookies.');
    }
  };

  // Escuchar el submit del formulario
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch(searchInput.value);
  });

  // Escuchar clics en los tags de sugerencia rápida
  suggestionTags.forEach(tag => {
    tag.addEventListener('click', () => {
      searchInput.value = tag.textContent;
      executeSearch(tag.textContent);
    });
  });

  // Mostrar mensajes de error de forma estilizada
  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // Animación suave de aparición del error
    errorMessage.classList.add('animate-pulse');
    setTimeout(() => {
      errorMessage.classList.remove('animate-pulse');
    }, 1000);
  }
});
