// Clave de API de RAWG - Proporcionada por el usuario
const RAWG_KEY = "a853e0e4673547d58acdc79a70494bb2";

document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const suggestionTags = document.querySelectorAll('.suggestion-tag');
  const autocompleteResults = document.getElementById('autocomplete-results');

  let debounceTimer;

  // Procesar y enviar la búsqueda final
  const executeSearch = (term) => {
    const cleanTerm = term.trim();
    errorMessage.classList.add('hidden');
    
    if (cleanTerm === '') {
      showError('Por favor, escribe el nombre de un videojuego válido.');
      return;
    }

    try {
      localStorage.setItem('gamerdex_search_term', cleanTerm);
      window.location.href = 'game-details.html';
    } catch (e) {
      console.error('Error al acceder al localStorage:', e);
      showError('Hubo un problema de almacenamiento en tu navegador. Por favor, habilita las cookies.');
    }
  };

  // Función Debounce para demorar las llamadas al autocompletado
  const debounce = (func, delay) => {
    return function (...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // Buscar sugerencias en RAWG API
  const fetchAutocompleteSuggestions = (query) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      autocompleteResults.innerHTML = "";
      autocompleteResults.classList.add('hidden');
      return;
    }

    fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(cleanQuery)}&page_size=5`)
      .then(res => {
        if (!res.ok) throw new Error("Error fetching autocomplete suggestions");
        return res.json();
      })
      .then(data => {
        if (data.results && data.results.length > 0) {
          renderAutocomplete(data.results);
        } else {
          autocompleteResults.innerHTML = `
            <div class="p-4 text-sm text-gray-500 text-center">
              <i class="fa-solid fa-face-frown mr-2"></i> Sin sugerencias para "${cleanQuery}"
            </div>`;
          autocompleteResults.classList.remove('hidden');
        }
      })
      .catch(err => {
        console.error("Autocompletado error:", err);
        autocompleteResults.classList.add('hidden');
      });
  };

  // Renderizar las sugerencias en el dropdown flotante
  const renderAutocomplete = (games) => {
    autocompleteResults.innerHTML = "";
    
    games.forEach(game => {
      const year = game.released ? new Date(game.released).getFullYear() : 'N/D';
      const item = document.createElement('div');
      item.className = "autocomplete-item flex items-center gap-3 p-3 cursor-pointer text-sm text-gray-200";
      
      const thumb = game.background_image 
        ? `<img src="${game.background_image}" class="w-12 h-8 object-cover rounded-md" alt="${game.name}">`
        : `<div class="w-12 h-8 bg-slate-800 rounded-md flex items-center justify-center text-slate-500"><i class="fa-solid fa-image text-xs"></i></div>`;
      
      item.innerHTML = `
        ${thumb}
        <div class="flex-grow min-w-0">
          <p class="font-bold truncate text-white">${game.name}</p>
          <p class="text-xs text-gray-400">${year} | ${game.genres && game.genres.length > 0 ? game.genres[0].name : 'General'}</p>
        </div>
      `;

      item.addEventListener('click', () => {
        searchInput.value = game.name;
        autocompleteResults.classList.add('hidden');
        executeSearch(game.name);
      });

      autocompleteResults.appendChild(item);
    });

    autocompleteResults.classList.remove('hidden');
  };

  // Escuchar el input con debounce de 300ms
  searchInput.addEventListener('input', debounce((e) => {
    fetchAutocompleteSuggestions(e.target.value);
  }, 300));

  // Escuchar el submit del formulario
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch(searchInput.value);
  });

  // Cerrar el dropdown si se hace clic fuera del buscador
  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
      autocompleteResults.classList.add('hidden');
    }
  });

  // Reabrir si se hace foco y tiene contenido
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 2 && autocompleteResults.children.length > 0) {
      autocompleteResults.classList.remove('hidden');
    }
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
    errorMessage.classList.add('animate-pulse');
    setTimeout(() => {
      errorMessage.classList.remove('animate-pulse');
    }, 1000);
  }
});
