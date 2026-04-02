/**
 * Weather Widget Plugin
 * Shows weather conditions at construction project sites
 */

module.exports = {
  lifecycle: {
    onEnable: async function() {
      },
    
    onDisable: async function() {
      },
  },
  
  hooks: {
    'dashboard:widget': async function(context, api) {
      // Register weather widget for dashboard
      api.ui.registerWidget({
        id: 'weather-widget',
        title: 'Project Site Weather',
        description: 'Current weather conditions at your project locations',
        component: WeatherWidget,
        defaultSize: { w: 3, h: 2 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 4, h: 3 },
      });
    },
    
    'project:tab': async function(context, api) {
      // Add weather tab to project pages
      if (context.project) {
        api.ui.registerTab(context.project.id, {
          id: 'weather-forecast',
          label: 'Weather',
          icon: 'Cloud',
          component: WeatherForecast,
          condition: (project) => {
            // Only show for projects with location data
            return project.location && (project.location.lat || project.location.address);
          },
        });
      }
    },
  },
  
  components: {
    settings: function WeatherSettings({ api }) {
      const [apiKey, setApiKey] = React.useState('');
      const [units, setUnits] = React.useState('metric');
      const [updateInterval, setUpdateInterval] = React.useState(30);
      
      React.useEffect(() => {
        api.storage.get('weather_settings').then(settings => {
          if (settings) {
            setApiKey(settings.apiKey || '');
            setUnits(settings.units || 'metric');
            setUpdateInterval(settings.updateInterval || 30);
          }
        });
      }, []);
      
      const saveSettings = async () => {
        await api.storage.set('weather_settings', {
          apiKey,
          units,
          updateInterval,
        });
        api.ui.showNotification('Weather settings saved', 'success');
      };
      
      return React.createElement('div', { className: 'space-y-4' },
        React.createElement('div', {},
          React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
            'OpenWeatherMap API Key'
          ),
          React.createElement('input', {
            type: 'password',
            value: apiKey,
            onChange: (e) => setApiKey(e.target.value),
            className: 'w-full px-3 py-2 border rounded-md',
            placeholder: 'Enter your API key',
          }),
          React.createElement('p', { className: 'text-xs text-muted-foreground mt-1' },
            'Get your free API key from openweathermap.org'
          )
        ),
        React.createElement('div', {},
          React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Units'),
          React.createElement('select', {
            value: units,
            onChange: (e) => setUnits(e.target.value),
            className: 'w-full px-3 py-2 border rounded-md',
          },
            React.createElement('option', { value: 'metric' }, 'Metric (°C, m/s)'),
            React.createElement('option', { value: 'imperial' }, 'Imperial (°F, mph)'),
            React.createElement('option', { value: 'kelvin' }, 'Scientific (K)')
          )
        ),
        React.createElement('div', {},
          React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
            'Update Interval (minutes)'
          ),
          React.createElement('input', {
            type: 'number',
            value: updateInterval,
            onChange: (e) => setUpdateInterval(parseInt(e.target.value)),
            className: 'w-full px-3 py-2 border rounded-md',
            min: 5,
            max: 120,
          })
        ),
        React.createElement('button', {
          onClick: saveSettings,
          className: 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600',
        }, 'Save Settings')
      );
    },
  },
};

// Weather Widget Component
function WeatherWidget({ api }) {
  const [weather, setWeather] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    fetchWeatherData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchWeatherData, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      
      // Get settings
      const settings = await api.storage.get('weather_settings');
      if (!settings?.apiKey) {
        setError('API key not configured');
        setLoading(false);
        return;
      }
      
      // Get active projects with locations
      const projects = await api.data.query('projects', {
        select: 'id, name, location',
        match: { status: 'active' },
        limit: 5,
      });
      
      const weatherData = [];
      
      for (const project of projects) {
        if (project.location?.lat && project.location?.lng) {
          const response = await api.http.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${project.location.lat}&lon=${project.location.lng}&appid=${settings.apiKey}&units=${settings.units || 'metric'}`
          );
          
          if (response.ok) {
            const data = await response.json();
            weatherData.push({
              projectId: project.id,
              projectName: project.name,
              temperature: data.main.temp,
              description: data.weather[0].description,
              icon: data.weather[0].icon,
              humidity: data.main.humidity,
              windSpeed: data.wind?.speed || 0,
            });
          }
        }
      }
      
      setWeather(weatherData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch weather data');
      } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-full' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2' }),
        React.createElement('p', { className: 'text-sm text-muted-foreground' }, 'Loading weather...')
      )
    );
  }
  
  if (error) {
    return React.createElement('div', { className: 'p-4 text-center' },
      React.createElement('div', { className: 'text-red-500 text-sm mb-2' }, error),
      React.createElement('button', {
        onClick: fetchWeatherData,
        className: 'text-blue-500 text-sm hover:underline',
      }, 'Retry')
    );
  }
  
  if (!weather || weather.length === 0) {
    return React.createElement('div', { className: 'p-4 text-center text-muted-foreground' },
      React.createElement('p', { className: 'text-sm' }, 'No project locations found'),
      React.createElement('p', { className: 'text-xs mt-1' }, 'Add locations to your projects to see weather data')
    );
  }
  
  return React.createElement('div', { className: 'p-4 space-y-3' },
    weather.map((item, index) => 
      React.createElement('div', { 
        key: item.projectId, 
        className: 'flex items-center justify-between p-2 bg-muted rounded-lg' 
      },
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('p', { 
            className: 'text-sm font-medium truncate',
            title: item.projectName 
          }, item.projectName),
          React.createElement('p', { className: 'text-xs text-muted-foreground capitalize' }, 
            item.description
          )
        ),
        React.createElement('div', { className: 'flex items-center space-x-2' },
          React.createElement('img', {
            src: `https://openweathermap.org/img/w/${item.icon}.png`,
            alt: item.description,
            className: 'w-8 h-8',
          }),
          React.createElement('span', { className: 'text-lg font-bold' }, 
            `${Math.round(item.temperature)}°`
          )
        )
      )
    ),
    React.createElement('div', { className: 'text-xs text-muted-foreground text-center' },
      'Last updated: ', new Date().toLocaleTimeString()
    )
  );
}

// Weather Forecast Component (for project tab)
function WeatherForecast({ projectId, api }) {
  const [forecast, setForecast] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    fetchForecastData();
  }, [projectId]);
  
  const fetchForecastData = async () => {
    try {
      // Get project location
      const projects = await api.data.query('projects', {
        select: 'location',
        match: { id: projectId },
      });
      
      const project = projects[0];
      if (!project?.location?.lat || !project?.location?.lng) {
        setForecast({ error: 'Project location not available' });
        setLoading(false);
        return;
      }
      
      const settings = await api.storage.get('weather_settings');
      if (!settings?.apiKey) {
        setForecast({ error: 'Weather API key not configured' });
        setLoading(false);
        return;
      }
      
      // Fetch 5-day forecast
      const response = await api.http.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${project.location.lat}&lon=${project.location.lng}&appid=${settings.apiKey}&units=${settings.units || 'metric'}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setForecast(data);
      } else {
        setForecast({ error: 'Failed to fetch forecast' });
      }
    } catch (err) {
      setForecast({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return React.createElement('div', { className: 'p-6 text-center' },
      React.createElement('div', { className: 'animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4' }),
      React.createElement('p', {}, 'Loading weather forecast...')
    );
  }
  
  if (forecast?.error) {
    return React.createElement('div', { className: 'p-6 text-center' },
      React.createElement('div', { className: 'text-red-500 mb-4' }, forecast.error),
      React.createElement('button', {
        onClick: fetchForecastData,
        className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
      }, 'Retry')
    );
  }
  
  // Group forecast by day
  const dailyForecasts = [];
  const today = new Date();
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    
    const dayForecasts = forecast.list.filter(item => 
      item.dt_txt.startsWith(dateString)
    );
    
    if (dayForecasts.length > 0) {
      dailyForecasts.push({
        date: date,
        forecasts: dayForecasts,
      });
    }
  }
  
  return React.createElement('div', { className: 'p-6' },
    React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 
      '5-Day Weather Forecast'
    ),
    React.createElement('div', { className: 'space-y-4' },
      dailyForecasts.map((day, index) => 
        React.createElement('div', { 
          key: index, 
          className: 'border rounded-lg p-4' 
        },
          React.createElement('h4', { className: 'font-medium mb-3' },
            day.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })
          ),
          React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
            day.forecasts.slice(0, 4).map((forecast, i) => 
              React.createElement('div', { 
                key: i, 
                className: 'text-center p-2 bg-muted rounded' 
              },
                React.createElement('div', { className: 'text-sm text-muted-foreground mb-1' },
                  new Date(forecast.dt_txt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true,
                  })
                ),
                React.createElement('img', {
                  src: `https://openweathermap.org/img/w/${forecast.weather[0].icon}.png`,
                  alt: forecast.weather[0].description,
                  className: 'w-8 h-8 mx-auto',
                }),
                React.createElement('div', { className: 'text-lg font-bold' },
                  `${Math.round(forecast.main.temp)}°`
                ),
                React.createElement('div', { className: 'text-xs text-muted-foreground capitalize' },
                  forecast.weather[0].description
                )
              )
            )
          )
        )
      )
    )
  );
}