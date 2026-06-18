// Clave de API de RAWG - Editable
const RAWG_KEY = "a853e0e4673547d58acdc79a70494bb2";

// Mapeo estático de tiendas populares de CheapShark para una UI Premium
const STORES_MAP = {
  "1": { name: "Steam", icon: "fa-brands fa-steam", color: "hover:text-cyan-400" },
  "2": { name: "GamersGate", icon: "fa-solid fa-gamepad", color: "hover:text-blue-400" },
  "3": { name: "GreenManGaming", icon: "fa-solid fa-shopping-basket", color: "hover:text-green-400" },
  "7": { name: "GOG.com", icon: "fa-solid fa-circle-play", color: "hover:text-purple-400" },
  "8": { name: "Origin / EA App", icon: "fa-solid fa-circle-nodes", color: "hover:text-orange-400" },
  "11": { name: "Humble Store", icon: "fa-solid fa-box-open", color: "hover:text-red-400" },
  "21": { name: "Fanatical", icon: "fa-solid fa-fire-flame-curved", color: "hover:text-amber-500" },
  "25": { name: "Epic Games Store", icon: "fa-solid fa-folder-open", color: "hover:text-teal-400" }
};

document.addEventListener('DOMContentLoaded', () => {
  const searchTerm = localStorage.getItem('gamerdex_search_term');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorContainer = document.getElementById('error-container');
  const detailsContent = document.getElementById('details-content');
  const btnRecommendations = document.getElementById('btn-recommendations');

  // Elementos del DOM a rellenar (RAWG)
  const heroBanner = document.getElementById('hero-banner');
  const gameThumbnail = document.getElementById('game-thumbnail');
  const gameGenreTag = document.getElementById('game-genre-tag');
  const gameTitleHeader = document.getElementById('game-title-header');
  const gameRelease = document.getElementById('game-release');
  const gamePlatforms = document.getElementById('game-platforms');
  const gameMetacritic = document.getElementById('game-metacritic');
  const gameGenres = document.getElementById('game-genres');
  const starsRating = document.getElementById('stars-rating');
  const ratingNumber = document.getElementById('rating-number');
  const rawgLinkContainer = document.getElementById('rawg-link-container');

  // Elementos del DOM (CheapShark)
  const cheapestHistoric = document.getElementById('cheapest-historic');
  const offersList = document.getElementById('offers-list');

  // Si no hay término de búsqueda, mostrar error y volver
  if (!searchTerm) {
    showError("No se especificó ningún término de búsqueda. Regresa al buscador.");
    return;
  }

  // --- CADENA DE PETICIONES ASÍNCRONAS ---
  // Hacemos el primer fetch a RAWG API
  fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(searchTerm)}`)
    .then(response => {
      if (!response.ok) throw new Error("Error en la respuesta de RAWG API");
      return response.json();
    })
    .then(data => {
      // Validar si encontramos resultados
      if (!data.results || data.results.length === 0) {
        throw new Error("No se encontraron resultados para este juego en la base de datos.");
      }

      const game = data.results[0]; // Tomamos el primer resultado como la coincidencia más exacta
      renderRawgData(game);

      // Guardar el género de forma segura en localStorage para recommendations.html
      if (game.genres && game.genres.length > 0) {
        // Guardamos el slug del primer género
        localStorage.setItem('gamerdex_genre', game.genres[0].slug);
        localStorage.setItem('gamerdex_genre_name', game.genres[0].name);
      } else {
        localStorage.setItem('gamerdex_genre', 'action'); // género por defecto
        localStorage.setItem('gamerdex_genre_name', 'Acción');
      }

      // Retornar el juego para que continúe la cadena de promesas
      return game;
    })
    // Encadenamos el segundo fetch a CheapShark de forma directa (sin usar llaves para el fetch en la promesa)
    .then(game => fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(game.name)}`))
    .then(response => {
      if (!response.ok) throw new Error("Error en la respuesta de CheapShark API");
      return response.json();
    })
    .then(cheapSharkGames => {
      // Si no hay coincidencias de ofertas en CheapShark
      if (!cheapSharkGames || cheapSharkGames.length === 0) {
        cheapestHistoric.textContent = "N/D";
        offersList.innerHTML = `
          <div class="text-slate-400 text-sm py-4 text-center glass-panel border border-slate-800 rounded-xl">
            <i class="fa-solid fa-info-circle mr-2 text-cyan-400"></i> No se encontraron ofertas vigentes de PC para este juego.
          </div>`;
        finishLoading();
        return;
      }

      const cheapGame = cheapSharkGames[0];
      cheapestHistoric.textContent = `$${cheapGame.cheapest}`;

      // Tercer fetch encadenado secundario: Detalles de ofertas usando gameID
      return fetch(`https://www.cheapshark.com/api/1.0/games?id=${cheapGame.gameID}`);
    })
    .then(response => {
      if (!response) return null; // Si el paso anterior retornó vacío
      if (!response.ok) throw new Error("Error al obtener las tiendas y ofertas detalladas de CheapShark");
      return response.json();
    })
    .then(dealDetails => {
      if (dealDetails) {
        renderOffers(dealDetails.deals);
      }
      finishLoading();
    })
    .catch(error => {
      console.error("Detalle del error:", error);
      showError(error.message);
    });

  // --- FUNCIONES AUXILIARES DE RENDERIZADO ---

  // Renderizar información de RAWG
  function renderRawgData(game) {
    // Banner e imagen de fondo
    if (game.background_image) {
      heroBanner.style.backgroundImage = `url('${game.background_image}')`;
      gameThumbnail.innerHTML = `<img src="${game.background_image}" alt="${game.name}" class="w-full h-full object-cover">`;
    } else {
      heroBanner.style.backgroundImage = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";
      gameThumbnail.innerHTML = `
        <div class="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
          <i class="fa-solid fa-image text-3xl"></i>
        </div>`;
    }

    // Título y Género Tag
    gameTitleHeader.textContent = game.name;
    if (game.genres && game.genres.length > 0) {
      gameGenreTag.textContent = game.genres[0].name;
      gameGenres.textContent = game.genres.map(g => g.name).join(', ');
    } else {
      gameGenreTag.textContent = "Desconocido";
      gameGenres.textContent = "No especificado";
    }

    // Fecha de lanzamiento
    gameRelease.textContent = game.released ? formatDate(game.released) : "Próximamente";

    // Plataformas
    if (game.platforms && game.platforms.length > 0) {
      gamePlatforms.textContent = game.platforms.map(p => p.platform.name).join(', ');
    } else {
      gamePlatforms.textContent = "No especificado";
    }

    // Metacritic Score
    if (game.metacritic) {
      gameMetacritic.textContent = game.metacritic;
      // Colorear según puntuación
      if (game.metacritic >= 75) {
        gameMetacritic.className = "text-lg font-black px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      } else if (game.metacritic >= 50) {
        gameMetacritic.className = "text-lg font-black px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30";
      } else {
        gameMetacritic.className = "text-lg font-black px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30";
      }
    } else {
      gameMetacritic.textContent = "N/D";
      gameMetacritic.className = "text-lg font-black px-2.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700";
    }

    // Estrellas de Calificación
    starsRating.innerHTML = "";
    const ratingVal = game.rating || 0;
    ratingNumber.textContent = `${ratingVal.toFixed(1)} / 5`;
    const fullStars = Math.floor(ratingVal);
    const halfStar = ratingVal % 1 >= 0.5 ? 1 : 0;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        starsRating.innerHTML += '<i class="fa-solid fa-star text-amber-400"></i>';
      } else if (i === fullStars + 1 && halfStar) {
        starsRating.innerHTML += '<i class="fa-solid fa-star-half-stroke text-amber-400"></i>';
      } else {
        starsRating.innerHTML += '<i class="fa-regular fa-star text-slate-600"></i>';
      }
    }

    // Enlace a RAWG
    rawgLinkContainer.innerHTML = `
      <a href="https://rawg.io/games/${game.slug}" target="_blank" class="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-semibold text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center gap-1.5">
        <span>Ver en RAWG</span> <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
      </a>`;
  }

  // Renderizar ofertas de CheapShark
  function renderOffers(deals) {
    offersList.innerHTML = "";
    
    // Filtramos deals para no repetir de la misma tienda (si los hay) y mostramos los primeros 4 mejores precios
    const uniqueDeals = [];
    const seenStores = new Set();
    
    for (const deal of deals) {
      if (!seenStores.has(deal.storeID)) {
        seenStores.add(deal.storeID);
        uniqueDeals.push(deal);
      }
      if (uniqueDeals.length >= 4) break;
    }

    if (uniqueDeals.length === 0) {
      offersList.innerHTML = `
        <div class="text-gray-500 text-sm py-4 text-center">
          No hay ofertas activas actualmente.
        </div>`;
      return;
    }

    uniqueDeals.forEach(deal => {
      const storeInfo = STORES_MAP[deal.storeID] || { name: "Tienda Digital", icon: "fa-solid fa-shop", color: "hover:text-slate-400" };
      const savingPercent = Math.round(parseFloat(deal.savings));
      
      const dealElement = document.createElement('div');
      dealElement.className = "flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all group";
      
      dealElement.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-lg bg-slate-850 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform ${storeInfo.color}">
            <i class="${storeInfo.icon} text-lg"></i>
          </div>
          <div>
            <span class="text-sm font-bold text-white block">${storeInfo.name}</span>
            ${savingPercent > 0 ? `<span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Ahorra ${savingPercent}%</span>` : ''}
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-base font-black text-cyan-400 font-gamer">$${deal.price}</div>
          ${savingPercent > 0 ? `<div class="text-xs text-gray-500 line-through">$${deal.retailPrice}</div>` : ''}
        </div>
      `;
      
      // Agregar interactividad de clic para ir a la oferta real
      dealElement.classList.add('cursor-pointer');
      dealElement.addEventListener('click', () => {
        window.open(`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`, '_blank');
      });

      offersList.appendChild(dealElement);
    });
  }

  // Finalizar carga y alternar visibilidad de paneles
  function finishLoading() {
    loadingSpinner.classList.add('hidden');
    detailsContent.classList.remove('hidden');
  }

  // Mostrar error estético en pantalla
  function showError(message) {
    loadingSpinner.classList.add('hidden');
    detailsContent.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    if (message) {
      document.getElementById('error-detail').textContent = message;
    }
  }

  // Formatear fechas de 'YYYY-MM-DD' a 'DD/MM/YYYY' o 'NombreMes YYYY'
  function formatDate(dateString) {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const dateObj = new Date(dateString + 'T00:00:00');
      return dateObj.toLocaleDateString('es-ES', options);
    } catch (e) {
      return dateString;
    }
  }

  // Lógica del botón de recomendaciones
  btnRecommendations.addEventListener('click', () => {
    window.location.href = 'recommendations.html';
  });
});
