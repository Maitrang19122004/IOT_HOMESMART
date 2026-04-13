const mysql = require('mysql2');
const env = require('./env');

const db = mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('❌ Lỗi kết nối MySQL:', err.message);
        return;
    }
    console.log('✅ Đã kết nối thành công tới MySQL:', env.DB_NAME);
});

module.exports = db;
