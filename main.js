// Clave de API de RAWG - Proporcionada por el usuario
const RAWG_KEY = "a853e0e4673547d58acdc79a70494bb2";

// Pool estático para generar sugerencias aleatorias al hacer foco
const RANDOM_POOL = [
  "Portal 2", 
  "The Witcher 3", 
  "Elden Ring", 
  "Cyberpunk 2077", 
  "Grand Theft Auto V", 
  "Batman: Arkham Knight", 
  "Hades", 
  "Red Dead Redemption 2",
  "Skyrim",
  "BioShock Infinite"
];

document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const autocompleteResults = document.getElementById('autocomplete-results');

  // Elementos de catálogos y sus spinners
  const heroHighlight = document.getElementById('hero-highlight');
  const heroTitle = document.getElementById('hero-title');
  const heroDesc = document.getElementById('hero-desc');
  const heroBtnDetails = document.getElementById('hero-btn-details');

  const categoryTabs = document.getElementById('category-tabs');
  const loadingCatalog = document.getElementById('loading-catalog');
  const catalogGrid = document.getElementById('catalog-grid');

  const loadingFree = document.getElementById('loading-free');
  const freeGrid = document.getElementById('free-grid');

  let debounceTimer;

  // Redirección segura a la vista de detalles
  const executeSearch = (term, slug = "") => {
    const cleanTerm = term.trim();
    if (errorMessage) errorMessage.classList.add('hidden');
    
    if (cleanTerm === '') {
      showError('Por favor, escribe el nombre de un videojuego.');
      return;
    }

    try {
      localStorage.setItem('gamerdex_search_term', cleanTerm);
      if (slug) {
        localStorage.setItem('gamerdex_search_slug', slug);
      } else {
        localStorage.removeItem('gamerdex_search_slug');
      }
      window.location.href = 'game-details.html?v=1.0.9';
    } catch (e) {
      console.error('Error al acceder al localStorage:', e);
      showError('Hubo un problema de almacenamiento en tu navegador. Por favor, habilita las cookies.');
    }
  };

  // Función Debounce
  const debounce = (func, delay) => {
    return function (...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // --- PRECARGA DEL CATÁLOGO INICIAL BLINDADA ---

  const loadInitialCatalog = () => {
    // 1. Cargar Destacado del Hero (Tendencias RAWG generales para poblar el banner superior)
    fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&ordering=-added&page_size=1`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.results && data.results.length > 0) {
          const featured = data.results[0];
          const heroBgImage = document.getElementById('hero-bg-image');
          if (heroBgImage && featured.background_image) {
            heroBgImage.style.backgroundImage = `url('${featured.background_image}')`;
          }
          if (heroTitle) heroTitle.textContent = featured.name;
          if (heroDesc) {
            heroDesc.textContent = `Explora la ficha técnica, plataformas de juego, y compara las mejores ofertas de PC en tiempo real para ${featured.name}. Calificación Metacritic: ${featured.metacritic || 'N/D'}.`;
          }
          if (heroBtnDetails) {
            heroBtnDetails.onclick = () => executeSearch(featured.name, featured.slug);
          }
        } else {
          fallbackHero();
        }
      })
      .catch(err => {
        console.error("Error cargando destacado del Hero:", err);
        fallbackHero();
      });

    // 2. Cargar catálogos por defecto (Acción)
    fetchCategoryGames("action");
    fetchFreeGamesByCategory("action");

    // 3. Enlazar pestañas de categorías
    if (categoryTabs) {
      const tabButtons = categoryTabs.querySelectorAll('button');
      tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const clickedBtn = e.currentTarget;
          const genreSlug = clickedBtn.getAttribute('data-genre');
          
          // Desactivar todos los botones
          tabButtons.forEach(b => {
            b.className = "px-4 py-1.5 rounded-lg text-xs font-bold uppercase bg-slate-900 border border-slate-800 text-gray-400 hover:text-white transition-all whitespace-nowrap cursor-pointer";
          });
          
          // Activar el botón seleccionado
          clickedBtn.className = "px-4 py-1.5 rounded-lg text-xs font-bold uppercase bg-sky-500 text-white shadow-md transition-all whitespace-nowrap cursor-pointer";
          
          // Mostrar spinners
          if (loadingCatalog) loadingCatalog.classList.remove('hidden');
          if (catalogGrid) catalogGrid.classList.add('hidden');
          if (loadingFree) loadingFree.classList.remove('hidden');
          if (freeGrid) freeGrid.classList.add('hidden');
          
          // Consultar APIs
          fetchCategoryGames(genreSlug);
          fetchFreeGamesByCategory(genreSlug);
        });
      });
    }
  };

  const fetchCategoryGames = (genreSlug) => {
    fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&genres=${genreSlug}&ordering=-added&page_size=8`)
      .then(res => {
        if (!res.ok) throw new Error("No se pudieron obtener juegos de la categoría.");
        return res.json();
      })
      .then(data => {
        const games = data.results || [];
        renderGrid(catalogGrid, games);
        if (loadingCatalog) loadingCatalog.classList.add('hidden');
        if (catalogGrid) catalogGrid.classList.remove('hidden');
      })
      .catch(err => {
        console.error("Error cargando categoría:", err);
        if (loadingCatalog) {
          loadingCatalog.innerHTML = `<span class="text-xs text-gray-500 py-4"><i class="fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i> No se pudieron obtener los juegos del catálogo.</span>`;
        }
      });
  };

  const fetchFreeGamesByCategory = (genreSlug) => {
    // Mapeo inteligente de géneros a categorías de Free-To-Play Games
    const F2P_GENRE_MAP = {
      "action": "action",
      "role-playing-games-rpg": "rpg",
      "strategy": "strategy",
      "platformer": "platformer",
      "shooter": "shooter"
    };

    const f2pCategory = F2P_GENRE_MAP[genreSlug] || "action";
    const f2pUrl = `https://www.freetogame.com/api/games?category=${f2pCategory}`;
    const f2pFallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(f2pUrl)}`;

    fetch(f2pUrl)
      .then(res => {
        if (!res.ok) throw new Error("Fallo directo F2P");
        return res.json();
      })
      .then(games => {
        renderFreeGrid(games.slice(0, 4));
      })
      .catch(err => {
        console.warn("Fallo directo CORS F2P. Usando contingencia proxy...", err);
        fetch(f2pFallbackUrl)
          .then(res => {
            if (!res.ok) throw new Error("Error proxy F2P");
            return res.json();
          })
          .then(data => {
            if (data.contents) {
              const games = JSON.parse(data.contents);
              renderFreeGrid(games.slice(0, 4));
            } else {
              throw new Error("Estructura de datos proxy inválida");
            }
          })
          .catch(proxyErr => {
            console.error("Ambos endpoints F2P fallaron:", proxyErr);
            if (loadingFree) {
              loadingFree.innerHTML = `<span class="text-xs text-gray-500 py-4"><i class="fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i> Alternativas F2P no disponibles para esta categoría.</span>`;
            }
          });
      });
  };

  const fallbackHero = () => {
    if (heroTitle) heroTitle.textContent = "GamerDex";
    if (heroDesc) heroDesc.textContent = "Busca tus videojuegos favoritos y compara ofertas en tiempo real.";
    const heroBgImage = document.getElementById('hero-bg-image');
    if (heroBgImage) heroBgImage.style.backgroundImage = "linear-gradient(135deg, #0f172a 0%, #090d16 100%)";
  };

  // Renderizar grids de RAWG (Catálogo)
  const renderGrid = (container, games) => {
    if (!container) return;
    container.innerHTML = "";
    
    if (games.length === 0) {
      container.innerHTML = `<p class="col-span-full text-center text-sm text-gray-500">No hay juegos disponibles para mostrar.</p>`;
      return;
    }

    games.forEach(game => {
      const card = document.createElement('div');
      card.className = "glass-panel rounded-xl overflow-hidden border border-slate-800/80 hover:border-sky-500/30 hover:shadow-[0_4px_15px_rgba(14,165,233,0.03)] transition-all duration-300 cursor-pointer flex flex-col group";
      
      const thumb = game.background_image 
        ? `<img src="${game.background_image}" class="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-300" alt="${game.name}">`
        : `<div class="w-full h-40 bg-slate-900 flex items-center justify-center text-slate-600"><i class="fa-solid fa-image text-2xl"></i></div>`;
      
      const ratingTag = game.metacritic 
        ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${game.metacritic}</span>`
        : '';

      card.innerHTML = `
        <div class="relative">
          ${thumb}
          <div class="absolute top-2 right-2 flex items-center">
            ${ratingTag}
          </div>
        </div>
        <div class="p-4 flex-grow flex flex-col justify-between">
          <h3 class="font-bold text-white font-gamer text-sm truncate group-hover:text-sky-400 transition-colors mb-1">${game.name}</h3>
          <span class="text-xs text-gray-400 font-medium">${game.released ? game.released.substring(0, 4) : 'Próximamente'}</span>
        </div>
      `;

      card.addEventListener('click', () => executeSearch(game.name, game.slug));
      container.appendChild(card);
    });
  };

  // Renderizar grid de F2P (Gratuitos)
  const renderFreeGrid = (games) => {
    if (!freeGrid) return;
    freeGrid.innerHTML = "";
    if (loadingFree) loadingFree.classList.add('hidden');
    freeGrid.classList.remove('hidden');

    if (!games || games.length === 0) {
      freeGrid.innerHTML = `<p class="col-span-full text-center text-sm text-gray-500">No hay juegos gratuitos disponibles.</p>`;
      return;
    }

    games.forEach(game => {
      const card = document.createElement('div');
      card.className = "glass-panel rounded-xl overflow-hidden border border-slate-800/80 hover:border-emerald-500/30 hover:shadow-[0_4px_15px_rgba(16,185,129,0.03)] transition-all duration-300 cursor-pointer flex flex-col group";

      card.innerHTML = `
        <div class="relative">
          <img src="${game.thumbnail}" class="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-300" alt="${game.title}">
          <span class="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm uppercase">Free</span>
        </div>
        <div class="p-4 flex-grow flex flex-col justify-between">
          <h3 class="font-bold text-white font-gamer text-sm truncate group-hover:text-emerald-400 transition-colors mb-1">${game.title}</h3>
          <span class="text-xs text-gray-400 font-medium">${game.platform}</span>
        </div>
      `;

      card.addEventListener('click', () => executeSearch(game.title));
      freeGrid.appendChild(card);
    });
  };

  // --- LÓGICA DE BÚSQUEDA Y AUTOCOMPLETADO ---

  // Mostrar sugerencias aleatorias al hacer foco (vacío)
  const showRandomSuggestions = () => {
    if (!autocompleteResults) return;
    autocompleteResults.innerHTML = "";
    
    const shuffled = [...RANDOM_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);

    selected.forEach(term => {
      const item = document.createElement('div');
      item.className = "autocomplete-item flex items-center gap-3 p-3 cursor-pointer text-xs text-gray-300";
      item.innerHTML = `
        <div class="w-7 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
          <i class="fa-solid fa-arrow-trend-up"></i>
        </div>
        <div class="flex-grow min-w-0">
          <p class="font-semibold text-gray-200">Sugerencia: <span class="text-sky-400 font-bold font-gamer">${term}</span></p>
        </div>
      `;

      item.addEventListener('click', () => {
        searchInput.value = term;
        autocompleteResults.classList.add('hidden');
        executeSearch(term);
      });

      autocompleteResults.appendChild(item);
    });

    autocompleteResults.classList.remove('hidden');
  };

  // Buscar autocompletado en RAWG
  const fetchAutocompleteSuggestions = (query) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      showRandomSuggestions();
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
            <div class="p-3 text-xs text-gray-500 text-center">
              <i class="fa-solid fa-face-frown mr-2"></i> Sin sugerencias para "${cleanQuery}"
            </div>`;
          autocompleteResults.classList.remove('hidden');
        }
      })
      .catch(err => {
        console.error("Autocompletado error:", err);
        if (autocompleteResults) autocompleteResults.classList.add('hidden');
      });
  };

  const renderAutocomplete = (games) => {
    if (!autocompleteResults) return;
    autocompleteResults.innerHTML = "";
    
    games.forEach(game => {
      const year = game.released ? game.released.substring(0, 4) : 'N/D';
      const item = document.createElement('div');
      item.className = "autocomplete-item flex items-center gap-3 p-2.5 cursor-pointer text-xs text-gray-200";
      
      const thumb = game.background_image 
        ? `<img src="${game.background_image}" class="w-10 h-7 object-cover rounded" alt="${game.name}">`
        : `<div class="w-10 h-7 bg-slate-800 rounded flex items-center justify-center text-slate-500"><i class="fa-solid fa-image text-[10px]"></i></div>`;
      
      item.innerHTML = `
        ${thumb}
        <div class="flex-grow min-w-0">
          <p class="font-bold truncate text-white text-xs">${game.name}</p>
          <p class="text-[10px] text-gray-400">${year} | ${game.genres && game.genres.length > 0 ? game.genres[0].name : 'General'}</p>
        </div>
      `;

      item.addEventListener('click', () => {
        searchInput.value = game.name;
        autocompleteResults.classList.add('hidden');
        executeSearch(game.name, game.slug);
      });

      autocompleteResults.appendChild(item);
    });

    autocompleteResults.classList.remove('hidden');
  };

  // Escuchar el input con debounce
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      fetchAutocompleteSuggestions(e.target.value);
    }, 300));

    // Al hacer click/focus en el input vacío, mostrar sugerencias aleatorias
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length < 2) {
        showRandomSuggestions();
      } else if (autocompleteResults && autocompleteResults.children.length > 0) {
        autocompleteResults.classList.remove('hidden');
      }
    });
  }

  // Escuchar el submit del formulario
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      executeSearch(searchInput.value);
    });
  }

  // Cerrar el dropdown si se hace clic fuera
  document.addEventListener('click', (e) => {
    if (searchForm && !searchForm.contains(e.target) && autocompleteResults) {
      autocompleteResults.classList.add('hidden');
    }
  });

  // Mostrar error
  function showError(message) {
    if (errorText) errorText.textContent = message;
    if (errorMessage) {
      errorMessage.classList.remove('hidden');
      errorMessage.classList.add('animate-pulse');
      setTimeout(() => {
        errorMessage.classList.remove('animate-pulse');
      }, 1000);
    }
  }

  // --- CARGAR CATÁLOGO INICIAL AL ARRANCAR ---
  loadInitialCatalog();
});
