// Common utility functions

export const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN');
};

export const formatTemperature = (temp) => {
    return `${temp.toFixed(1)}°C`;
};

export const formatHumidity = (humi) => {
    return `${humi.toFixed(1)}%`;
};

export const formatLight = (light) => {
    return `${light.toFixed(0)} Lux`;
};

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

export const throttle = (func, delay) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
};
