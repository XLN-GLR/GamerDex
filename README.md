# 🚀 GamerDex

Dashboard interactivo y adaptativo desarrollado como actividad práctica de integración de servicios externos en producción.

## 🛠️ Arquitectura del Proyecto
La aplicación consta de un cliente estático (Frontend) desarrollado con HTML5 nativo, estilos de diseño responsivo, e integra un flujo lógico de llamadas Fetch asíncronas para resolver y sincronizar los datos de 3 proveedores externos.

```
   [ Usuario interactúa con la interfaz ]
                     |
                     v
             [ APP FRONTEND ]
         /           |           \
        v            v            v
  [ API Clima ]  [ API Países ]  [ API Imágenes ]
```

## 🔌 APIs Utilizadas en la Aplicación
1. **RAWG API**: Obtiene datos técnicos, sinopsis e imágenes de videojuegos.
2. **CheapShark API**: Compara precios y encuentra ofertas en tiendas digitales.
3. **Free-To-Play Games API**: Recomienda juegos gratuitos del mismo género.

## 💻 Configuración Local e Instalación
1. Clona este repositorio público:
   ```bash
   git clone https://github.com/tu-usuario/nombre-del-repo.git
   ```
2. Abre el archivo `index.html` de forma directa o ejecuta un servidor en vivo local. No requiere variables de entorno pesadas en el cliente local.
