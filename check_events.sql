-- Consultar tipos de eventos na tabela analytics_events
SELECT 
    event_type,
    COUNT(*) as total_events,
    COUNT(DISTINCT site_slug) as sites_affected,
    MIN(event_timestamp) as first_event,
    MAX(event_timestamp) as last_event
FROM elevea.analytics_events 
WHERE site_slug = 'digital-marketing-pro'
GROUP BY event_type
ORDER BY total_events DESC;

-- Consultar eventos recentes para ver detalhes
SELECT 
    event_type,
    event_details,
    page_url,
    event_timestamp,
    device_type,
    browser
FROM elevea.analytics_events 
WHERE site_slug = 'digital-marketing-pro'
ORDER BY event_timestamp DESC
LIMIT 10;
