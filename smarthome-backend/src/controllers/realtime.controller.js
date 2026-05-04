const realtimeService = require('../services/realtime.service');

const streamEvents = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = realtimeService.subscribe((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(keepAlive);
        unsubscribe();
        res.end();
    });
};

module.exports = {
    streamEvents
};
