(function () {
  const normalizeUrl = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\/+$/g, '');
  };

  const defaultApiBaseUrl = normalizeUrl(
    window.CARDAPIO_API_BASE_URL || 'https://us-central1-ana-guimaraes.cloudfunctions.net/api',
  );
  const configuredEndpoint = normalizeUrl(window.MAPS_KEY_ENDPOINT);
  const mapsKeyEndpoint = configuredEndpoint || `${defaultApiBaseUrl}/maps-key`;
  let mapsScriptPromise = null;

  const fetchMapsApiKey = async () => {
    const response = await fetch(mapsKeyEndpoint, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Falha ao obter chave do Maps (${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.key) {
      throw new Error('Resposta do endpoint de chave do Maps está incompleta.');
    }

    return payload.key;
  };

  window.getGoogleMapsApiKey = fetchMapsApiKey;

  window.loadGoogleMapsScript = async () => {
    if (window.google?.maps) {
      return window.google.maps;
    }

    if (mapsScriptPromise) {
      return mapsScriptPromise;
    }

    mapsScriptPromise = fetchMapsApiKey().then(
      (apiKey) =>
        new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            apiKey,
          )}&libraries=places,marker&v=weekly`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve(window.google?.maps);
          script.onerror = () => {
            mapsScriptPromise = null;
            reject(new Error('Não foi possível carregar o Google Maps.'));
          };

          document.head.appendChild(script);
        }),
    );

    return mapsScriptPromise;
  };
})();
