'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ParametresPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var supabase_1 = require("@/lib/supabase");
var auth_1 = require("@/lib/auth");
var PARAM_GROUPS = [
    { title: 'Entreprise', icon: '🏢', keys: ['entreprise.nom', 'entreprise.adresse', 'entreprise.ville', 'entreprise.telephone', 'entreprise.email', 'entreprise.nif', 'entreprise.stat', 'entreprise.slogan'] },
    { title: 'Caisse', icon: '💰', keys: ['caisse.devise', 'caisse.nom_poste', 'caisse.version', 'caisse.remise1', 'caisse.remise2'] },
    { title: 'Impression', icon: '🖨️', keys: ['impression.imprimante', 'impression.largeur', 'impression.copies_ticket', 'impression.copies_cloture', 'impression.actif'] },
    { title: 'Licence', icon: '🔑', keys: ['license.first_launch', 'license.monthly_activated_at', 'license.monthly_expires_at'] },
];
var LICENSE_DECRYPT_KEYS = new Set(['license.monthly_activated_at', 'license.monthly_expires_at']);
var LICENSE_SECRET = 'clinocaisse_secure_key_1412_0410';
function hexToUint8Array(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}
function getAesKey() {
    return __awaiter(this, void 0, void 0, function () {
        var secretBytes, hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    secretBytes = new TextEncoder().encode(LICENSE_SECRET);
                    return [4 /*yield*/, crypto.subtle.digest('SHA-256', secretBytes)];
                case 1:
                    hash = _a.sent();
                    return [2 /*return*/, crypto.subtle.importKey('raw', hash, { name: 'AES-CBC' }, false, ['decrypt'])];
            }
        });
    });
}
function decryptLicenseValue(encrypted) {
    return __awaiter(this, void 0, void 0, function () {
        var parts, iv, ciphertext, key, decryptedBuffer, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    parts = encrypted.split(':');
                    if (parts.length !== 2)
                        return [2 /*return*/, null];
                    iv = hexToUint8Array(parts[0]);
                    ciphertext = hexToUint8Array(parts[1]);
                    return [4 /*yield*/, getAesKey()];
                case 1:
                    key = _a.sent();
                    return [4 /*yield*/, crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, key, ciphertext)];
                case 2:
                    decryptedBuffer = _a.sent();
                    return [2 /*return*/, new TextDecoder().decode(decryptedBuffer)];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getParamValue(cle, valeur) {
    return __awaiter(this, void 0, void 0, function () {
        var decrypted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!valeur)
                        return [2 /*return*/, ''];
                    if (!LICENSE_DECRYPT_KEYS.has(cle))
                        return [2 /*return*/, valeur];
                    return [4 /*yield*/, decryptLicenseValue(valeur)];
                case 1:
                    decrypted = _a.sent();
                    return [2 /*return*/, decrypted !== null && decrypted !== void 0 ? decrypted : valeur];
            }
        });
    });
}
function ParamCard(_a) {
    var title = _a.title, icon = _a.icon, params = _a.params, group = _a.group;
    return (<div className="card">
      <div className="card-header">
        <h3 className="card-title">{icon} {title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {group.keys.map(function (k) {
            var v = params[k];
            var label = k.split('.').slice(1).join('.').replace(/_/g, ' ');
            return (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: k.includes('license') ? 'var(--font-mono)' : 'inherit', maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v == null || v === '' ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Non défini</span> : v}
              </span>
            </div>);
        })}
      </div>
    </div>);
}
function ParametresPage() {
    var _this = this;
    var client = (0, supabase_1.getSupabaseClient)();
    var _a = (0, react_1.useState)({}), params = _a[0], setParams = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)({ url: '', label: '' }), dbInfo = _c[0], setDbInfo = _c[1];
    var load = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var data, map;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!client)
                        return [2 /*return*/];
                    setLoading(true);
                    return [4 /*yield*/, client.from('parametres').select('cle, valeur')];
                case 1:
                    data = (_a.sent()).data;
                    map = {};
                    return [4 /*yield*/, Promise.all((data || []).map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (!p.cle)
                                            return [2 /*return*/];
                                        _a = map;
                                        _b = p.cle;
                                        return [4 /*yield*/, getParamValue(p.cle, p.valeur)];
                                    case 1:
                                        _a[_b] = _c.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _a.sent();
                    setParams(map);
                    setDbInfo({ url: (0, auth_1.getDbUrl)(), label: (0, auth_1.getDbLabel)() });
                    setLoading(false);
                    return [2 /*return*/];
            }
        });
    }); }, [client]);
    (0, react_1.useEffect)(function () { load(); }, [load]);
    if (loading)
        return <div className="state-box"><div className="spinner" style={{ width: 32, height: 32 }}/></div>;
    return (<div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Configuration système (lecture seule depuis le dashboard)</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}><lucide_react_1.RefreshCw size={13}/> Actualiser</button>
        </div>
      </div>

      {/* DB Info Card */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))', borderColor: 'rgba(124,58,237,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <lucide_react_1.Database size={20} style={{ color: 'white' }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Base de données connectée</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, background: 'var(--success)', borderRadius: '50%' }}/>
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Connecté</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dbInfo.url}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Projet</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-violet-light)' }}>{dbInfo.label}</div>
          </div>
        </div>
      </div>

      {/* Params Groups */}
      <div className="grid-2">
        {PARAM_GROUPS.map(function (g) { return (<ParamCard key={g.title} title={g.title} icon={g.icon} params={params} group={g}/>); })}
      </div>

      {/* All other params */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title"><lucide_react_1.Server size={15}/> Tous les paramètres ({Object.keys(params).length})</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {Object.entries(params)
            .filter(function (_a) {
            var k = _a[0];
            return k !== 'license.activated';
        })
            .sort(function (_a, _b) {
            var a = _a[0];
            var b = _b[0];
            return a.localeCompare(b);
        })
            .map(function (_a) {
            var k = _a[0], v = _a[1];
            return (<div key={k} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>vide</span>}
              </div>
            </div>);
        })}
        </div>
      </div>
    </div>);
}
