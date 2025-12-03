// server.js (PostgreSQL 版本)

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = 3000;

// --- 数据库配置 (PostgreSQL) ---
// !!! 警告：请将 'your_strong_password' 替换为您创建的密码！
const pool = new Pool({
    user: 'roulette_user',
    host: 'localhost',
    database: 'roulette_db',
    password: 'wmydpw231014',
    port: 5432,
});

// --- Express 配置 ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 数据库连接与初始化 ---
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client from pool', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL database.');
    release();

    // 初始化表结构
    const initSql = `
        CREATE TABLE IF NOT EXISTS items (
            id SERIAL PRIMARY KEY,
            food VARCHAR(255) NOT NULL,
            weight INTEGER NOT NULL
        );
    `;
    pool.query(initSql)
        .then(() => {
            return pool.query("SELECT COUNT(*) FROM items");
        })
        .then(res => {
            // 如果表为空，插入初始数据
            if (parseInt(res.rows[0].count) === 0) {
                const initialItems = [
                    { food: '麻辣烫', weight: 30 },
                    { food: '沙拉', weight: 15 },
                    { food: '面条', weight: 20 },
                    { food: '汉堡', weight: 10 },
                    { food: '自热火锅', weight: 25 }
                ];
                const promises = initialItems.map(item => {
                    return pool.query("INSERT INTO items (food, weight) VALUES ($1, $2)", [item.food, item.weight]);
                });
                return Promise.all(promises).then(() => console.log('Inserted initial data into PostgreSQL.'));
            }
        })
        .catch(e => console.error('Error during database initialization', e.stack));
});

// --- API 接口 ---

// GET /api/roulette: 获取转盘内容及比例
app.get('/api/roulette', async (req, res) => {
    try {
        const result = await pool.query("SELECT food, weight FROM items ORDER BY id");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database fetch error: ' + err.message });
    }
});

// POST /api/roulette/update: 动态修改转盘内容及比例
app.post('/api/roulette/update', async (req, res) => {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid items list.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // 开启事务

        // 1. 清空旧数据
        await client.query("DELETE FROM items");

        // 2. 插入新数据
        const insertPromises = items.map(item => {
            return client.query("INSERT INTO items (food, weight) VALUES ($1, $2)", [item.food, item.weight]);
        });
        await Promise.all(insertPromises);

        await client.query('COMMIT'); // 提交事务
        res.json({ message: 'Roulette items updated successfully in PostgreSQL.' });
    } catch (e) {
        await client.query('ROLLBACK'); // 出现错误时回滚
        res.status(500).json({ error: 'Update failed: ' + e.message });
    } finally {
        client.release(); // 释放连接
    }
});

// POST /api/roulette/spin: 随机选取一个食物
app.post('/api/roulette/spin', async (req, res) => {
    try {
        const result = await pool.query("SELECT food, weight FROM items");
        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(500).json({ error: 'No items available.' });
        }

        // --- 核心概率选取逻辑 ---
        const totalWeight = rows.reduce((sum, item) => sum + parseInt(item.weight), 0);
        const randomNumber = Math.floor(Math.random() * totalWeight) + 1;

        let cumulativeWeight = 0;
        let selectedItem = null;

        for (const item of rows) {
            cumulativeWeight += parseInt(item.weight);
            if (randomNumber <= cumulativeWeight) {
                selectedItem = item.food;
                break;
            }
        }

        if (!selectedItem) {
             selectedItem = rows[rows.length - 1].food;
        }

        res.json({ selectedFood: selectedItem, items: rows });
    } catch (err) {
        res.status(500).json({ error: 'Spin failed: ' + err.message });
    }
});

// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});