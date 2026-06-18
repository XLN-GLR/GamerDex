// Clave de API de RAWG - Proporcionada por el usuario
const RAWG_KEY = "a853e0e4673547d58acdc79a70494bb2";

// Clave de API de Gemini - Deja esta constante editable para el usuario
const GEMINI_KEY = "TU_API_KEY_AQUI";

// Contexto global del videojuego cargado para alimentar a Gemini
let currentGameContext = {
  name: "Videojuego",
  platforms: "PC",
  genres: "Acción",
  release: "N/D",
  metacritic: "N/D"
};

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

  // Elementos del DOM (Chatbot)
  const chatbotContainer = document.getElementById('chatbot-container');
  const chatbotToggleBtn = document.getElementById('chatbot-toggle-btn');
  const chatbotWindow = document.getElementById('chatbot-window');
  const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
  const chatbotForm = document.getElementById('chatbot-form');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotMessages = document.getElementById('chatbot-messages');

  // Si no hay término de búsqueda, mostrar error
  if (!searchTerm) {
    showError("No se especificó ningún término de búsqueda. Regresa al buscador.");
    return;
  }

  // --- CADENA DE PETICIONES ASÍNCRONAS ---
  // Primer fetch a RAWG API
  fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(searchTerm)}`)
    .then(response => {
      if (!response.ok) throw new Error("Error en la respuesta de RAWG API");
      return response.json();
    })
    .then(data => {
      if (!data.results || data.results.length === 0) {
        throw new Error("No se encontraron resultados para este juego en la base de datos.");
      }

      const game = data.results[0]; // Tomamos el primer resultado
      
      // Guardar información en el contexto global del juego para Gemini
      currentGameContext = {
        name: game.name,
        platforms: game.platforms ? game.platforms.map(p => p.platform.name).join(', ') : "PC",
        genres: game.genres ? game.genres.map(g => g.name).join(', ') : "Acción",
        release: game.released ? formatDate(game.released) : "N/D",
        metacritic: game.metacritic || "N/D"
      };

      renderRawgData(game);

      // Guardar el género en localStorage para la página de recomendaciones
      if (game.genres && game.genres.length > 0) {
        localStorage.setItem('gamerdex_genre', game.genres[0].slug);
        localStorage.setItem('gamerdex_genre_name', game.genres[0].name);
      } else {
        localStorage.setItem('gamerdex_genre', 'action');
        localStorage.setItem('gamerdex_genre_name', 'Acción');
      }

      return game;
    })
    // Encadenamos el segundo fetch a CheapShark de forma directa sin usar llaves
    .then(game => fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(game.name)}`))
    .then(response => {
      if (!response.ok) throw new Error("Error en la respuesta de CheapShark API");
      return response.json();
    })
    .then(cheapSharkGames => {
      if (!cheapSharkGames || cheapSharkGames.length === 0) {
        cheapestHistoric.textContent = "N/D";
        offersList.innerHTML = `
          <div class="text-slate-400 text-sm py-4 text-center glass-panel border border-slate-800 rounded-xl">
            <i class="fa-solid fa-info-circle mr-2 text-cyan-400"></i> No se encontraron ofertas de PC en CheapShark.
          </div>`;
        finishLoading();
        return;
      }

      const cheapGame = cheapSharkGames[0];
      cheapestHistoric.textContent = `$${cheapGame.cheapest}`;

      // Petición de ofertas detalladas por ID
      return fetch(`https://www.cheapshark.com/api/1.0/games?id=${cheapGame.gameID}`);
    })
    .then(response => {
      if (!response) return null;
      if (!response.ok) throw new Error("Error al obtener las ofertas detalladas de CheapShark");
      return response.json();
    })
    .then(dealDetails => {
      if (dealDetails) {
        renderOffers(dealDetails.deals);
      }
      finishLoading();
    })
    .catch(error => {
      console.error("Error en flujo de carga:", error);
      showError(error.message);
    });

  // --- FUNCIONES AUXILIARES DE RENDERIZADO ---

  function renderRawgData(game) {
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

    gameTitleHeader.textContent = game.name;
    if (game.genres && game.genres.length > 0) {
      gameGenreTag.textContent = game.genres[0].name;
      gameGenres.textContent = game.genres.map(g => g.name).join(', ');
    } else {
      gameGenreTag.textContent = "Desconocido";
      gameGenres.textContent = "No especificado";
    }

    gameRelease.textContent = game.released ? formatDate(game.released) : "Próximamente";

    if (game.platforms && game.platforms.length > 0) {
      gamePlatforms.textContent = game.platforms.map(p => p.platform.name).join(', ');
    } else {
      gamePlatforms.textContent = "No especificado";
    }

    if (game.metacritic) {
      gameMetacritic.textContent = game.metacritic;
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

    rawgLinkContainer.innerHTML = `
      <a href="https://rawg.io/games/${game.slug}" target="_blank" class="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-semibold text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center gap-1.5">
        <span>Ver en RAWG</span> <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
      </a>`;
  }

  function renderOffers(deals) {
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
        <div class="text-gray-500 text-sm py-4 text-center">
          No hay ofertas activas actualmente.
        </div>`;
      return;
    }

    uniqueDeals.forEach(deal => {
      const storeInfo = STORES_MAP[deal.storeID] || { name: "Tienda Digital", icon: "fa-solid fa-shop", color: "hover:text-slate-400" };
      const savingPercent = Math.round(parseFloat(deal.savings));
      
      const dealElement = document.createElement('div');
      dealElement.className = "flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all group cursor-pointer";
      
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
      
      dealElement.addEventListener('click', () => {
        window.open(`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`, '_blank');
      });

      offersList.appendChild(dealElement);
    });
  }

  function finishLoading() {
    loadingSpinner.classList.add('hidden');
    detailsContent.classList.remove('hidden');
  }

  function showError(message) {
    loadingSpinner.classList.add('hidden');
    detailsContent.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    if (message) {
      document.getElementById('error-detail').textContent = message;
    }
  }

  function formatDate(dateString) {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const dateObj = new Date(dateString + 'T00:00:00');
      return dateObj.toLocaleDateString('es-ES', options);
    } catch (e) {
      return dateString;
    }
  }

  // --- LÓGICA DEL CHATBOT CON GEMINI ---

  // Abrir y cerrar ventana de chat
  chatbotToggleBtn.addEventListener('click', () => {
    chatbotWindow.classList.toggle('hidden');
    // Hacer scroll automático al abrir
    scrollToBottom();
    // Eliminar las notificaciones (círculos de alerta) al abrir
    const pings = chatbotToggleBtn.querySelectorAll('span');
    pings.forEach(ping => ping.remove());
  });

  chatbotCloseBtn.addEventListener('click', () => {
    chatbotWindow.classList.add('hidden');
  });

  // Procesar el envío de mensajes
  chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatbotInput.value.trim();
    if (!message) return;

    // Renderizar mensaje del usuario en pantalla
    appendMessage(message, 'user');
    chatbotInput.value = "";
    scrollToBottom();

    // Comprobar si la API Key está configurada
    if (GEMINI_KEY === "TU_API_KEY_AQUI" || GEMINI_KEY.trim() === "") {
      setTimeout(() => {
        appendMessage("❌ Error: Clave de API de Gemini no configurada. Por favor, edita la constante GEMINI_KEY al inicio de `details.js` con tu API Key de Google AI Studio.", 'bot-error');
        scrollToBottom();
      }, 600);
      return;
    }

    // Mostrar estado de carga ("escribiendo...")
    const loadingBubble = appendLoadingBubble();
    scrollToBottom();

    // Preparar el prompt del sistema y el cuerpo de la consulta
    const systemPrompt = `Actúas como un Asistente Gamer virtual e inteligente para el sitio GamerDex. Tu especialidad es aconsejar y responder sobre el videojuego "${currentGameContext.name}".
Detalles técnicos de este juego:
- Plataformas: ${currentGameContext.platforms}
- Géneros: ${currentGameContext.genres}
- Fecha de lanzamiento: ${currentGameContext.release}
- Calificación Metacritic: ${currentGameContext.metacritic}

Responde en español de forma entusiasta, clara y corta (máximo 3 oraciones), utilizando argot o lenguaje gamer amigable. Si el usuario te pregunta sobre temas no relacionados a los videojuegos o a este juego en particular, recuérdale con humor cibernético que solo eres un bot de videojuegos.

Mensaje del usuario: ${message}`;

    // Estructurar el JSON para Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }]
    };

    // Consultar la API de Gemini
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
      .then(res => {
        if (!res.ok) throw new Error("Fallo en la comunicación con la API de Gemini");
        return res.json();
      })
      .then(data => {
        // Remover burbuja de carga
        loadingBubble.remove();
        
        // Extraer texto
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          const reply = data.candidates[0].content.parts[0].text;
          appendMessage(reply, 'bot');
        } else {
          throw new Error("Respuesta inválida de la IA");
        }
        scrollToBottom();
      })
      .catch(err => {
        console.error("Chatbot Error:", err);
        loadingBubble.remove();
        appendMessage("👾 *El enlace de red con el asistente se ha caído.* Reintenta en unos segundos o comprueba la validez de tu clave de Gemini.", 'bot-error');
        scrollToBottom();
      });
  });

  // Agregar burbuja de mensaje en la UI
  function appendMessage(text, sender) {
    const bubble = document.createElement('div');
    
    if (sender === 'user') {
      bubble.className = "chat-bubble-user p-3 max-w-[85%] self-end text-gray-100 shadow-md";
      bubble.textContent = text;
    } else if (sender === 'bot') {
      bubble.className = "chat-bubble-bot p-3 max-w-[85%] self-start text-gray-255 shadow-md leading-relaxed";
      // Reemplazo básico de negrita en markdown a etiquetas html para mejor estética
      bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    } else { // bot-error
      bubble.className = "p-3 max-w-[85%] self-start rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs shadow-md";
      bubble.innerHTML = text;
    }
    
    chatbotMessages.appendChild(bubble);
  }

  // Burbuja de carga animada
  function appendLoadingBubble() {
    const bubble = document.createElement('div');
    bubble.className = "chat-bubble-bot p-3 max-w-[85%] self-start text-gray-400 flex items-center gap-1.5 shadow-md";
    bubble.id = "chatbot-loading";
    bubble.innerHTML = `
      <span class="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce"></span>
      <span class="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      <span class="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
      <span class="text-xs ml-1 font-semibold uppercase tracking-wider text-gray-500">Procesando...</span>
    `;
    chatbotMessages.appendChild(bubble);
    return bubble;
  }

  // Scroll automático al final del panel de chat
  function scrollToBottom() {
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  // Lógica del botón de recomendaciones
  btnRecommendations.addEventListener('click', () => {
    window.location.href = 'recommendations.html';
  });
});
