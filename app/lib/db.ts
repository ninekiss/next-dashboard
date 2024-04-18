import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

// 连接数据库
export const db = new sqlite3.Database('./db/dd.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('已成功连接到SQLite数据库');
});
