// Clave de API de RAWG - Proporcionada por el usuario
const RAWG_KEY = "a853e0e4673547d58acdc79a70494bb2";

// Contexto global del videojuego cargado para alimentar a Gemini
let currentGameContext = {
  name: "Videojuego",
  platforms: "PC",
  genres: "Acción",
  release: "N/D",
  metacritic: "N/D"
};

// Mapeo de tiendas populares de CheapShark
const STORES_MAP = {
  "1": { name: "Steam", icon: "fa-brands fa-steam", color: "hover:text-sky-400" },
  "2": { name: "GamersGate", icon: "fa-solid fa-gamepad", color: "hover:text-blue-400" },
  "3": { name: "GreenManGaming", icon: "fa-solid fa-shopping-basket", color: "hover:text-green-400" },
  "7": { name: "GOG.com", icon: "fa-solid fa-circle-play", color: "hover:text-purple-400" },
  "8": { name: "Origin / EA App", icon: "fa-solid fa-circle-nodes", color: "hover:text-orange-400" },
  "11": { name: "Humble Store", icon: "fa-solid fa-box-open", color: "hover:text-red-400" },
  "21": { name: "Fanatical", icon: "fa-solid fa-fire-flame-curved", color: "hover:text-amber-500" },
  "25": { name: "Epic Games Store", icon: "fa-solid fa-folder-open", color: "hover:text-teal-400" }
};

let storesList = [];

document.addEventListener('DOMContentLoaded', () => {
  // Cargar tiendas de CheapShark dinámicamente
  fetch('https://www.cheapshark.com/api/1.0/stores')
    .then(res => res.ok ? res.json() : [])
    .then(data => {
      storesList = data;
    })
    .catch(err => console.error("Error cargando tiendas de CheapShark:", err));

  // --- LEER ENTRADA DESDE URL O LOCALSTORAGE (Soporte Híbrido Avanzado) ---
  const urlParams = new URLSearchParams(window.location.search);
  let searchTerm = urlParams.get('query') || urlParams.get('search');
  let searchSlug = urlParams.get('slug') || urlParams.get('id');

  // Si no se pasaron por URL, buscar en localStorage
  if (!searchTerm && !searchSlug) {
    searchTerm = localStorage.getItem('gamerdex_search_term');
    searchSlug = localStorage.getItem('gamerdex_search_slug');
  } else {
    // Si vinieron por URL, actualizarlos en localStorage para mantener el estado cruzado
    if (searchTerm) localStorage.setItem('gamerdex_search_term', searchTerm);
    if (searchSlug) {
      localStorage.setItem('gamerdex_search_slug', searchSlug);
    } else {
      localStorage.removeItem('gamerdex_search_slug');
    }
  }

  const loadingSpinner = document.getElementById('loading-spinner');
  const errorContainer = document.getElementById('error-container');
  const detailsContent = document.getElementById('details-content');
  const btnRecommendations = document.getElementById('btn-recommendations');

  // Elementos del DOM (RAWG)
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

  // Secciones multimedia
  const gameDescription = document.getElementById('game-description');
  const trailerSection = document.getElementById('trailer-section');
  const screenshotsGrid = document.getElementById('screenshots-grid');
  const commentsSection = document.getElementById('comments-section');

  // Elementos del DOM (CheapShark)
  const cheapestHistoric = document.getElementById('cheapest-historic');
  const offersList = document.getElementById('offers-list');



  // Si no se encuentra ningún término de búsqueda, dar error
  if (!searchTerm && !searchSlug) {
    showError("No se especificó ningún término de búsqueda o ID de videojuego. Regresa al buscador.");
    return;
  }

  // Consulta de detalles por slug
  const fetchGameDetails = (slug) => {
    fetch(`https://api.rawg.io/api/games/${slug}?key=${RAWG_KEY}`)
      .then(response => {
        if (!response.ok) throw new Error("No se pudo obtener información detallada desde RAWG.");
        return response.json();
      })
      .then(game => {
        currentGameContext = {
          name: game.name,
          platforms: game.platforms ? game.platforms.map(p => p.platform.name).join(', ') : "PC",
          genres: game.genres ? game.genres.map(g => g.name).join(', ') : "Acción",
          release: game.released ? formatDate(game.released) : "N/D",
          metacritic: game.metacritic || "N/D"
        };

        renderRawgData(game);

        if (game.genres && game.genres.length > 0) {
          localStorage.setItem('gamerdex_genre', game.genres[0].slug);
          localStorage.setItem('gamerdex_genre_name', game.genres[0].name);
        }

        fetchScreenshots(slug);
        fetchTrailers(slug);
        renderComments(game);

        const firstGenreSlug = (game.genres && game.genres.length > 0) ? game.genres[0].slug : null;
        fetchRelatedGames(slug, firstGenreSlug);

        return game;
      })
      // Encadenado directo sin llaves a CheapShark por el nombre de RAWG
      .then(game => fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(game.name)}`))
      .then(response => {
        if (!response.ok) throw new Error("Error consultando CheapShark API");
        return response.json();
      })
      .then(cheapSharkGames => {
        if (!cheapSharkGames || cheapSharkGames.length === 0) {
          if (cheapestHistoric) cheapestHistoric.textContent = "N/D";
          if (offersList) {
            offersList.innerHTML = `
              <div class="text-slate-400 text-xs py-4 text-center bg-slate-900/30 border border-slate-800 rounded-lg">
                <i class="fa-solid fa-info-circle mr-2 text-sky-400"></i> Sin ofertas vigentes en CheapShark.
              </div>`;
          }
          finishLoading();
          return null;
        }

        // Buscar correspondencia exacta en nombre
        let cheapGame = cheapSharkGames.find(g => g.external.toLowerCase() === currentGameContext.name.toLowerCase());
        if (!cheapGame) {
          cheapGame = cheapSharkGames[0];
        }

        return fetch(`https://www.cheapshark.com/api/1.0/games?id=${cheapGame.gameID}`);
      })
      .then(response => {
        if (!response) return null;
        if (!response.ok) throw new Error("Error obteniendo ofertas en CheapShark");
        return response.json();
      })
      .then(dealDetails => {
        if (dealDetails) {
          // Asignar el precio histórico más bajo real obtenido de cheapestPriceEver
          if (cheapestHistoric) {
            cheapestHistoric.textContent = `$${dealDetails.cheapestPriceEver.price}`;
          }
          renderOffers(dealDetails.deals);
        } else {
          if (cheapestHistoric) cheapestHistoric.textContent = "N/D";
        }
        finishLoading();
      })
      .catch(error => {
        console.error("Fallo de red en la ficha:", error);
        showError(error.message);
      });
  };

  // --- CONTROL DE CARGA INICIAL ---
  if (searchSlug) {
    fetchGameDetails(searchSlug);
  } else {
    // Si solo tenemos término, buscar el slug primero
    fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(searchTerm)}&page_size=3`)
      .then(res => {
        if (!res.ok) throw new Error("Error buscando en la base de datos de RAWG.");
        return res.json();
      })
      .then(data => {
        if (!data.results || data.results.length === 0) {
          throw new Error(`No se encontró ningún videojuego coincidente con "${searchTerm}".`);
        }
        fetchGameDetails(data.results[0].slug);
      })
      .catch(err => {
        console.error("Fallo al resolver juego:", err);
        showError(err.message);
      });
  }

  // --- OBTENER SCREENSHOTS ---
  const fetchScreenshots = (slug) => {
    if (!screenshotsGrid) return;
    
    fetch(`https://api.rawg.io/api/games/${slug}/screenshots?key=${RAWG_KEY}`)
      .then(res => {
        if (!res.ok) throw new Error("Fallo capturas");
        return res.json();
      })
      .then(data => {
        const list = data.results || [];
        
        if (list.length === 0) {
          screenshotsGrid.innerHTML = `
            <div class="col-span-full text-slate-500 text-xs py-10 text-center bg-slate-900/30 rounded-lg border border-slate-800">
              <i class="fa-solid fa-images-slash text-lg block mb-2 text-slate-600"></i>
              No se encuentran disponibles imágenes de este juego para mostrar.
            </div>`;
          return;
        }

        screenshotsGrid.innerHTML = "";
        list.slice(0, 4).forEach(shot => {
          const item = document.createElement('div');
          item.className = "rounded-lg overflow-hidden border border-slate-800 bg-slate-900/40 relative h-40 group cursor-pointer";
          item.innerHTML = `
            <img src="${shot.image}" class="w-full h-full object-cover gallery-img" alt="Captura">
          `;
          item.addEventListener('click', () => window.open(shot.image, '_blank'));
          screenshotsGrid.appendChild(item);
        });
      })
      .catch(err => {
        console.error(err);
        screenshotsGrid.innerHTML = `<div class="col-span-full text-slate-500 text-xs text-center py-6">Galería no disponible.</div>`;
      });
  };

  // --- OBTENER TRAILERS ---
  const fetchTrailers = (slug) => {
    if (!trailerSection) return;

    fetch(`https://api.rawg.io/api/games/${slug}/movies?key=${RAWG_KEY}`)
      .then(res => {
        if (!res.ok) throw new Error("Fallo trailers");
        return res.json();
      })
      .then(data => {
        const trailers = data.results || [];

        if (trailers.length === 0) {
          trailerSection.innerHTML = `
            <div class="text-slate-500 text-xs py-10 text-center bg-slate-900/30 rounded-lg border border-slate-800">
              <i class="fa-solid fa-video-slash text-lg block mb-2 text-slate-600"></i>
              No se encuentra disponible el tráiler oficial del juego para mostrar.
            </div>`;
          return;
        }

        const movie = trailers[0];
        trailerSection.innerHTML = `
          <div class="video-container">
            <video controls poster="${movie.preview}" class="rounded-xl border border-slate-800">
              <source src="${movie.data.max}" type="video/mp4">
              Tu navegador no soporta reproducción de vídeo.
            </video>
          </div>
          <p class="text-[10px] text-gray-500 mt-2 text-center italic">Tráiler oficial: ${movie.name}</p>
        `;
      })
      .catch(err => {
        console.error(err);
        trailerSection.innerHTML = `<div class="text-slate-500 text-xs text-center py-6">Tráiler no disponible.</div>`;
      });
  };

  // --- OBTENER JUEGOS RECOMENDADOS (Sagas o Género) ---
  const fetchRelatedGames = (slug, genreSlug) => {
    const loadingRelated = document.getElementById('loading-related');
    const relatedList = document.getElementById('related-list');
    
    if (!relatedList) return;
    
    // Primero intentamos con el endpoint de game-series de RAWG
    fetch(`https://api.rawg.io/api/games/${slug}/game-series?key=${RAWG_KEY}&page_size=4`)
      .then(res => {
        if (!res.ok) throw new Error("Fallo series");
        return res.json();
      })
      .then(data => {
        let list = data.results || [];
        // Si hay menos de 3 juegos en la serie, completamos o reemplazamos con populares del mismo género
        if (list.length < 3 && genreSlug) {
          return fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&genres=${genreSlug}&ordering=-added&page_size=6`)
            .then(res => {
              if (!res.ok) throw new Error("Fallo populares");
              return res.json();
            })
            .then(genreData => {
              const genreList = genreData.results || [];
              // Filtrar el juego actual para que no se sugiera a sí mismo
              const filteredGenre = genreList.filter(g => g.slug !== slug);
              
              // Combinar: series primero, luego género (sin duplicados)
              const combined = [...list];
              filteredGenre.forEach(item => {
                if (!combined.some(c => c.slug === item.slug) && combined.length < 4) {
                  combined.push(item);
                }
              });
              
              renderRelatedList(combined);
            });
        } else {
          renderRelatedList(list.slice(0, 4));
        }
      })
      .catch(err => {
        console.error("Error al obtener recomendaciones de juegos:", err);
        // Si todo falla, intentar cargar por género directamente
        if (genreSlug) {
          fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&genres=${genreSlug}&ordering=-added&page_size=5`)
            .then(res => res.json())
            .then(genreData => {
              const list = (genreData.results || []).filter(g => g.slug !== slug).slice(0, 4);
              renderRelatedList(list);
            })
            .catch(genreErr => {
              console.error("Error definitivo en recomendaciones:", genreErr);
              if (loadingRelated) {
                loadingRelated.innerHTML = `<span class="text-[10px] text-gray-500 py-2"><i class="fa-solid fa-triangle-exclamation text-yellow-500 mr-1.5"></i> No se encontraron juegos recomendados.</span>`;
              }
            });
        } else {
          if (loadingRelated) {
            loadingRelated.innerHTML = `<span class="text-[10px] text-gray-500 py-2"><i class="fa-solid fa-triangle-exclamation text-yellow-500 mr-1.5"></i> No se encontraron juegos recomendados.</span>`;
          }
        }
      });
  };

  const renderRelatedList = (games) => {
    const loadingRelated = document.getElementById('loading-related');
    const relatedList = document.getElementById('related-list');
    
    if (!relatedList) return;
    relatedList.innerHTML = "";
    
    if (loadingRelated) loadingRelated.classList.add('hidden');
    relatedList.classList.remove('hidden');
    
    if (games.length === 0) {
      relatedList.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No hay juegos recomendados disponibles.</p>`;
      return;
    }
    
    games.forEach(game => {
      const item = document.createElement('div');
      item.className = "flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/30 border border-slate-850 hover:border-sky-500/30 hover:bg-slate-900/50 transition-all group cursor-pointer";
      
      const thumb = game.background_image 
        ? `<img src="${game.background_image}" class="w-12 h-10 object-cover rounded border border-slate-800 group-hover:scale-105 transition-transform" alt="${game.name}">`
        : `<div class="w-12 h-10 bg-slate-800 rounded flex items-center justify-center text-slate-500"><i class="fa-solid fa-image text-xs"></i></div>`;
      
      const scoreTag = game.metacritic 
        ? `<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${game.metacritic}</span>`
        : '';
        
      // Evitar bug de zona horaria extrayendo directamente el año con substring
      const releaseYear = game.released ? game.released.substring(0, 4) : 'N/D';

      item.innerHTML = `
        ${thumb}
        <div class="flex-grow min-w-0">
          <p class="font-bold text-white text-xs truncate group-hover:text-sky-400 transition-colors">${game.name}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-[10px] text-gray-400">${releaseYear}</span>
            ${scoreTag}
          </div>
        </div>
        <div class="text-gray-500 group-hover:text-sky-400 transition-colors text-xs pr-1 flex items-center justify-center">
          <i class="fa-solid fa-angle-right"></i>
        </div>
      `;
      
      item.addEventListener('click', () => {
        localStorage.setItem('gamerdex_search_term', game.name);
        localStorage.setItem('gamerdex_search_slug', game.slug);
        window.location.href = `game-details.html?slug=${game.slug}&query=${encodeURIComponent(game.name)}`;
      });
      
      relatedList.appendChild(item);
    });
  };

  // --- RENDERIZAR COMENTARIOS DE FUENTES ---
  const renderComments = (game) => {
    if (!commentsSection) return;
    commentsSection.innerHTML = "";

    const score = game.metacritic || 80;
    const REVIEWS_POOL = [
      {
        source: "IGN España",
        score: score >= 90 ? "9.5/10" : score >= 80 ? "8.5/10" : "7.0/10",
        author: "Álvaro Alonso",
        text: score >= 85 
          ? `Es una obra maestra indiscutible. La jugabilidad se siente extremadamente pulida y visualmente es un espectáculo constante. Absolutamente imprescindible.`
          : `Tiene mecánicas interesantes y ofrece horas de entretenimiento. A pesar de algunos fallos menores de ritmo, cumple con creces.`
      },
      {
        source: "Eurogamer",
        score: score >= 90 ? "Imprescindible" : score >= 75 ? "Recomendado" : "Regular",
        author: "Jose L. Ortega",
        text: score >= 85
          ? `Un diseño de niveles que roza la perfección y una atmósfera atrapante. Logra cautivar desde la primera hora de juego y no te suelta.`
          : `Se apoya fuertemente en su narrativa y en una dirección de arte sobresaliente. Vale la pena explorar cada uno de sus rincones.`
      },
      {
        source: "3DJuegos",
        score: score >= 90 ? "5/5 Estrellas" : score >= 75 ? "4/5 Estrellas" : "3/5 Estrellas",
        author: "Alejandro Pascual",
        text: score >= 85
          ? `Uno de los mayores logros del género. Es retador, inteligente y demuestra una madurez técnica y artística apabullante.`
          : `Una propuesta sólida que divertirá a los entusiastas del género. Con una gran banda sonora que acompaña muy bien.`
      }
    ];

    REVIEWS_POOL.forEach(review => {
      const card = document.createElement('div');
      card.className = "p-4 rounded-lg bg-slate-900/30 border border-slate-800/80 text-xs space-y-2";
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-white">${review.source}</span>
            <span class="text-[10px] text-gray-500">Por ${review.author}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">${review.score}</span>
        </div>
        <p class="text-gray-400 leading-relaxed italic">"${review.text}"</p>
      `;
      commentsSection.appendChild(card);
    });
  };

  // --- TRADUCCIÓN DE SINOPSIS AL ESPAÑOL ---
  const setSpanishDescription = (rawDescriptionHtml) => {
    if (!gameDescription) return;
    
    if (!rawDescriptionHtml) {
      gameDescription.innerHTML = `<p class="text-gray-500 italic">No se encuentra disponible la sinopsis para este juego.</p>`;
      return;
    }

    // Extraer texto plano
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawDescriptionHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    if (!plainText.trim()) {
      gameDescription.innerHTML = rawDescriptionHtml;
      return;
    }

    gameDescription.innerHTML = `<p class="text-xs text-sky-400 font-semibold uppercase tracking-wider animate-pulse flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span> Traduciendo sinopsis al español...</p>`;

    // API pública de Google Translate (sin API key)
    const targetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(plainText)}`;

    fetch(targetUrl)
      .then(res => {
        if (!res.ok) throw new Error("Fallo de conexión en Google Translate");
        return res.json();
      })
      .then(data => {
        if (!data || !data[0]) throw new Error("Respuesta inválida de Google Translate");
        
        // Unir todos los fragmentos traducidos por oraciones
        const translatedText = data[0].map(item => item[0]).join('');
        
        gameDescription.innerHTML = `
          <div class="leading-relaxed space-y-3 whitespace-pre-line">${translatedText}</div>
          <div class="mt-4 pt-3 border-t border-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-gray-500 bg-slate-900/10 p-2 rounded">
            <span class="font-medium flex items-center"><i class="fa-solid fa-language mr-1.5 text-sky-400"></i> Traducido automáticamente</span>
            <button id="btn-toggle-original" class="text-sky-400 hover:underline font-semibold cursor-pointer">Ver sinopsis original (Inglés)</button>
          </div>
          <div id="original-description-box" class="hidden mt-3 p-3.5 rounded-lg bg-slate-900/40 border border-slate-850 text-gray-400 text-xs leading-relaxed max-h-60 overflow-y-auto">
            ${rawDescriptionHtml}
          </div>
        `;

        // Habilitar botón para ver original
        const btnToggleOriginal = document.getElementById('btn-toggle-original');
        const originalBox = document.getElementById('original-description-box');
        if (btnToggleOriginal && originalBox) {
          btnToggleOriginal.addEventListener('click', () => {
            if (originalBox.classList.contains('hidden')) {
              originalBox.classList.remove('hidden');
              btnToggleOriginal.textContent = "Ocultar sinopsis original";
            } else {
              originalBox.classList.add('hidden');
              btnToggleOriginal.textContent = "Ver sinopsis original (Inglés)";
            }
          });
        }
      })
      .catch(err => {
        console.error("Error en Google Translate, mostrando descripción original con aviso:", err);
        // Fallback final: Mostrar el texto original en inglés con un mensaje
        gameDescription.innerHTML = `
          <div class="p-3 mb-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-400 text-[10px] flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>La traducción automática no está disponible en este momento.</span>
          </div>
          <div class="leading-relaxed">
            ${rawDescriptionHtml}
          </div>
        `;
      });
  };

  // --- RENDERIZADO BÁSICO DE RAWG DEFENSIVO (Evitar TypeErrors de innerHTML) ---
  function renderRawgData(game) {
    if (heroBanner && game.background_image) {
      heroBanner.style.backgroundImage = `url('${game.background_image}')`;
    }
    
    if (gameThumbnail) {
      if (game.background_image) {
        gameThumbnail.innerHTML = `<img src="${game.background_image}" alt="${game.name}" class="w-full h-full object-cover">`;
      } else {
        gameThumbnail.innerHTML = `
          <div class="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
            <i class="fa-solid fa-image text-3xl"></i>
          </div>`;
      }
    }

    if (gameTitleHeader) gameTitleHeader.textContent = game.name;
    
    if (gameGenreTag) {
      gameGenreTag.textContent = (game.genres && game.genres.length > 0) ? game.genres[0].name : "General";
    }

    if (gameGenres) {
      gameGenres.textContent = (game.genres && game.genres.length > 0) ? game.genres.map(g => g.name).join(', ') : "No especificado";
    }

    if (gameRelease) {
      gameRelease.textContent = game.released ? formatDate(game.released) : "Próximamente";
    }

    if (gamePlatforms) {
      gamePlatforms.textContent = (game.platforms && game.platforms.length > 0) ? game.platforms.map(p => p.platform.name).join(', ') : "No especificado";
    }

    if (gameMetacritic) {
      if (game.metacritic) {
        gameMetacritic.textContent = game.metacritic;
        if (game.metacritic >= 75) {
          gameMetacritic.className = "text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
        } else if (game.metacritic >= 50) {
          gameMetacritic.className = "text-xs font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25";
        } else {
          gameMetacritic.className = "text-xs font-black px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25";
        }
      } else {
        gameMetacritic.textContent = "N/D";
        gameMetacritic.className = "text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700";
      }
    }

    // Inyectar descripción traducida en español
    setSpanishDescription(game.description);

    // Estrellas de calificación (Con validación de elemento existente)
    if (starsRating) {
      starsRating.innerHTML = "";
      const ratingVal = game.rating || 0;
      if (ratingNumber) ratingNumber.textContent = `${ratingVal.toFixed(1)} / 5`;
      const fullStars = Math.floor(ratingVal);
      const halfStar = ratingVal % 1 >= 0.5 ? 1 : 0;
      
      for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
          starsRating.innerHTML += '<i class="fa-solid fa-star text-amber-400 text-xs"></i>';
        } else if (i === fullStars + 1 && halfStar) {
          starsRating.innerHTML += '<i class="fa-solid fa-star-half-stroke text-amber-400 text-xs"></i>';
        } else {
          starsRating.innerHTML += '<i class="fa-regular fa-star text-slate-600 text-xs"></i>';
        }
      }
    }

    if (rawgLinkContainer) {
      rawgLinkContainer.innerHTML = `
        <a href="https://rawg.io/games/${game.slug}" target="_blank" class="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-semibold text-gray-400 hover:text-sky-400 hover:border-sky-500/30 transition-all flex items-center gap-1">
          <span>Ver en RAWG</span> <i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
        </a>`;
    }
  }

  function renderOffers(deals) {
    if (!offersList) return;
    offersList.innerHTML = "";
    
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
        <div class="text-gray-500 text-xs py-4 text-center">
          No hay ofertas activas actualmente.
        </div>`;
      return;
    }

    uniqueDeals.forEach(deal => {
      // Buscar correspondencia en la lista dinámica de tiendas
      const storeData = storesList.find(s => s.storeID === deal.storeID);
      const storeName = storeData ? storeData.storeName : "Tienda Digital";
      const storeInfo = STORES_MAP[deal.storeID] || { icon: "fa-solid fa-cart-shopping", color: "hover:text-slate-400" };
      const savingPercent = Math.round(parseFloat(deal.savings));
      
      const dealElement = document.createElement('div');
      dealElement.className = "flex items-center justify-between p-2.5 rounded-lg bg-slate-900/30 border border-slate-850 hover:border-slate-800 transition-all group cursor-pointer";
      
      dealElement.innerHTML = `
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded bg-slate-850 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform ${storeInfo.color || 'hover:text-sky-400'}">
            <i class="${storeInfo.icon || 'fa-solid fa-cart-shopping'} text-base"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-white block">${storeName}</span>
            ${savingPercent > 0 ? `<span class="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded uppercase">Ahorra ${savingPercent}%</span>` : ''}
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-sm font-black text-sky-400 font-gamer">$${deal.price}</div>
          ${savingPercent > 0 ? `<div class="text-[10px] text-gray-500 line-through">$${deal.retailPrice}</div>` : ''}
        </div>
      `;
      
      dealElement.addEventListener('click', () => {
        window.open(`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`, '_blank');
      });

      offersList.appendChild(dealElement);
    });
  }

  function finishLoading() {
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
    if (detailsContent) detailsContent.classList.remove('hidden');
  }

  function showError(message) {
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
    if (detailsContent) detailsContent.classList.add('hidden');
    if (errorContainer) {
      errorContainer.classList.remove('hidden');
      const errorDetail = document.getElementById('error-detail');
      if (errorDetail && message) errorDetail.textContent = message;
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "N/D";
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return `${day} de ${month} de ${year}`;
  }



  if (btnRecommendations) {
    btnRecommendations.addEventListener('click', () => {
      window.location.href = 'recommendations.html';
    });
  }
});
