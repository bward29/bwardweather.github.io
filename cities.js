const CITIES = {
    searchCities: async (searchText) => {
        try {
            // Get coordinates and state info using geocoding API
            const geoResponse = await fetch(
                `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchText)}&limit=10&appid=${CONFIG.API_KEY}`
            );
            if (!geoResponse.ok) throw new Error('Geo search failed');
            const geoData = await geoResponse.json();

            // Get weather for each location
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

            // Filter out failed requests and format results
            return citiesWithWeather.filter(city => city !== null);

        } catch (error) {
            console.error('Error searching cities:', error);
            return [];
        }
    }
};