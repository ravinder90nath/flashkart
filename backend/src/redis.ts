import { createClient } from "redis";
import { config } from "./config";
export const redis = createClient({ url: config.redisUrl });
redis.on("error", (e) => console.error("Redis error", e));
export const RESERVE_LUA = `local stock=tonumber(redis.call('GET',KEYS[1]) or '-1'); local qty=tonumber(ARGV[1]); if stock<0 then return {-2} end; if qty<1 then return {-3} end; if stock<qty then return {0,stock} end; redis.call('DECRBY',KEYS[1],qty); redis.call('HSET',KEYS[2],'reservationId',ARGV[2],'quantity',ARGV[1],'expiresAt',ARGV[3]); redis.call('EXPIRE',KEYS[2],ARGV[4]); return {1,stock-qty}`;
export const RELEASE_LUA = `local rid=redis.call('HGET',KEYS[2],'reservationId'); if not rid then return 0 end; if rid~=ARGV[1] then return -1 end; local qty=tonumber(redis.call('HGET',KEYS[2],'quantity') or '0'); redis.call('INCRBY',KEYS[1],qty); redis.call('DEL',KEYS[2]); return qty`;
