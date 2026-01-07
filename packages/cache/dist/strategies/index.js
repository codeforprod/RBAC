"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TTL_OPTIONS = exports.TTLStrategy = exports.LRUStrategy = void 0;
var lru_strategy_1 = require("./lru-strategy");
Object.defineProperty(exports, "LRUStrategy", { enumerable: true, get: function () { return lru_strategy_1.LRUStrategy; } });
var ttl_strategy_1 = require("./ttl-strategy");
Object.defineProperty(exports, "TTLStrategy", { enumerable: true, get: function () { return ttl_strategy_1.TTLStrategy; } });
Object.defineProperty(exports, "DEFAULT_TTL_OPTIONS", { enumerable: true, get: function () { return ttl_strategy_1.DEFAULT_TTL_OPTIONS; } });
//# sourceMappingURL=index.js.map