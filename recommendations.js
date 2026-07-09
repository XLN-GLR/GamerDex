// Mapeo inteligente de géneros de RAWG a categorías de Free-To-Play Games
const GENRE_MAP = {
  "action": "action",
  "shooter": "shooter",
  "strategy": "strategy",
  "role-playing-games-rpg": "rpg",
  "rpg": "rpg",
  "racing": "racing",
  "sports": "sports",
  "fighting": "fighting",
  "simulation": "sandbox",
  "adventure": "fantasy",
  "massively-multiplayer": "mmo",
  "platformer": "platformer",
  "indie": "action",
  "casual": "sports"
};

document.addEventListener('DOMContentLoaded', () => {
  const genreSlug = localStorage.getItem('gamerdex_genre') || 'action';
  const genreName = localStorage.getItem('gamerdex_genre_name') || 'Acción';
  
  const genreTitlePlaceholder = document.getElementById('genre-title-placeholder');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorContainer = document.getElementById('error-container');
  const catalogGrid = document.getElementById('catalog-grid');
  const btnRetry = document.getElementById('btn-retry');

  // Actualizar el título en pantalla
  genreTitlePlaceholder.textContent = genreName;

  // Obtener la categoría F2P correspondiente
  const f2pCategory = GENRE_MAP[genreSlug] || "action";

  // Redirección segura a la vista de detalles
  const executeSearch = (title) => {
    localStorage.setItem('gamerdex_search_term', title);
    localStorage.removeItem('gamerdex_search_slug');
    window.location.href = 'game-details.html?v=1.0.5';
  };

  // Función para obtener y renderizar los juegos gratis
  const fetchFreeGames = () => {
    loadingSpinner.classList.remove('hidden');
    catalogGrid.classList.add('hidden');
    errorContainer.classList.add('hidden');

    const primaryUrl = `https://www.freetogame.com/api/games?category=${f2pCategory}`;
    // Proxy transparente por si la API bloquea el fetch directo por restricciones CORS (muy común en producción)
    const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`;

    // Intentar Fetch directo
    fetch(primaryUrl)
      .then(response => {
        if (!response.ok) throw new Error("Error en la petición directa");
        return response.json();
      })
      .then(games => {
        renderCatalog(games);
      })
      .catch(err => {
        console.warn("Fetch directo falló (CORS o Red). Iniciando contingencia con proxy...", err);
        // Fallback automático transparente
        return fetch(fallbackUrl)
          .then(response => {
            if (!response.ok) throw new Error("La API externa no está disponible en este momento.");
            return response.json();
          })
          .then(games => {
            renderCatalog(games);
          })
          .catch(fallbackErr => {
            console.error("Ambos métodos de fetch fallaron:", fallbackErr);
            showError("No se pudieron cargar juegos recomendados en este momento. Inténtalo de nuevo más tarde.");
          });
      });
  };

  // Renderizar los primeros 6 juegos en el Grid
  function renderCatalog(games) {
    catalogGrid.innerHTML = "";
    
    if (!games || games.length === 0) {
      showError(`No hay alternativas gratuitas activas en la categoría '${genreName}'.`);
      return;
    }

    // Tomar solo los primeros 6 resultados
    const limitGames = games.slice(0, 6);

    limitGames.forEach(game => {
      // Determinar icono de plataforma
      let platformIcon = "fa-solid fa-desktop";
      if (game.platform && game.platform.toLowerCase().includes("window")) {
        platformIcon = "fa-brands fa-windows";
      } else if (game.platform && game.platform.toLowerCase().includes("browser")) {
        platformIcon = "fa-solid fa-globe";
      }

      const card = document.createElement('div');
      card.className = "glass-panel rounded-2xl overflow-hidden neon-border-green flex flex-col justify-between group cursor-pointer hover:border-emerald-500/30 hover:shadow-[0_4px_15px_rgba(16,185,129,0.03)] transition-all duration-300";

      card.innerHTML = `
        <div>
          <!-- Miniatura -->
          <div class="h-48 overflow-hidden relative border-b border-slate-800">
            <img src="${game.thumbnail}" alt="${game.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <span class="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              Free to Play
            </span>
          </div>

          <!-- Contenido -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-white font-gamer truncate mb-2 group-hover:text-emerald-400 transition-colors duration-200">
              ${game.title}
            </h3>
            <p class="text-sm text-gray-400 line-clamp-3 mb-4 leading-relaxed">
              ${game.short_description}
            </p>
          </div>
        </div>

        <!-- Pie de tarjeta -->
        <div class="px-6 pb-6 pt-2 flex flex-col gap-3 border-t border-slate-800/40 mt-auto">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 flex items-center gap-1.5 font-semibold">
              <i class="${platformIcon} text-emerald-400 text-sm"></i> ${game.platform}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2.5 w-full">
            <button class="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-900 border border-slate-800 text-gray-300 hover:text-sky-400 hover:border-sky-500/30 transition-all text-center flex items-center justify-center gap-1">
              Ver Reseña <i class="fa-solid fa-circle-info"></i>
            </button>
            <a href="${game.game_url}" target="_blank" class="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all duration-300 text-center flex items-center justify-center gap-1">
              Jugar Gratis <i class="fa-solid fa-circle-arrow-right"></i>
            </a>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        executeSearch(game.title);
      });

      catalogGrid.appendChild(card);
    });

    // Quitar spinner y mostrar rejilla
    loadingSpinner.classList.add('hidden');
    catalogGrid.classList.remove('hidden');
  }

  // Mostrar error
  function showError(message) {
    loadingSpinner.classList.add('hidden');
    catalogGrid.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    if (message) {
      document.getElementById('error-detail').textContent = message;
    }
  }

  // Botón de reintento
  btnRetry.addEventListener('click', fetchFreeGames);

  // Carga inicial
  fetchFreeGames();
});
