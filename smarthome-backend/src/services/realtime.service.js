const { EventEmitter } = require('events');

const realtimeBus = new EventEmitter();

realtimeBus.setMaxListeners(0);

const publishEvent = (type, payload) => {
    realtimeBus.emit('event', {
        type,
        payload,
        timestamp: new Date().toISOString()
    });
};

const subscribe = (listener) => {
    realtimeBus.on('event', listener);
    return () => realtimeBus.off('event', listener);
};

module.exports = {
    publishEvent,
    subscribe
};
