const CITIES = {
    searchCities: async (searchText) => {
        try {
            const geoResponse = await fetch(
                `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(searchText)}&limit=10&appid=${CONFIG.API_KEY}`
            );
            if (!geoResponse.ok) throw new Error('Geo search failed');
            const geoData = await geoResponse.json();

            const citiesWithWeather = await Promise.all(
                geoData.map(async (location) => {
                    const weatherResponse = await fetch(
                        `${CONFIG.BASE_URL}/weather?lat=${location.lat}&lon=${location.lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}`
                    );
                    if (!weatherResponse.ok) return null;
                    const weatherData = await weatherResponse.json();

                    return {
                        ...weatherData,
                        geoData: location,
                        coord: {
                            lat: location.lat,
                            lon: location.lon
                        }
                    };
                })
            );

            return citiesWithWeather.filter(city => city !== null);

        } catch (error) {
            console.error('Error searching cities:', error);
            return [];
        }
    }
};