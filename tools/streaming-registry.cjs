'use strict';

// Service research is deliberately separate from title/season availability.
// A listing here never grants a matcher provider, entitlement or watch URL.
const fs = require('node:fs');
const path = require('node:path');
const OFFER_TYPES = ['subscription', 'free_ads', 'free', 'rent', 'buy', 'live_tv', 'sports', 'tv_everywhere'];
const FOCUS_TYPES = ['movies', 'series', 'documentaries', 'anime', 'kdrama', 'local', 'sports', 'live', 'kids', 'arthouse', 'faith', 'music'];
const isIsoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;

function requireHttps(value, label) {
  let url;
  try { url = new URL(value); } catch (_) { throw new Error(`${label}: invalid URL`); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) {
    throw new Error(`${label}: public HTTPS URL required`);
  }
}

function validateRegistry(registry) {
  if (!registry || registry.schema_version !== 1 || !Array.isArray(registry.services)) {
    throw new Error('Unsupported streaming service registry');
  }
  if(!isIsoDate(registry.research_date))throw new Error('Registry research date required');
  const ids = new Set();
  for (const service of registry.services) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.id || '') || ids.has(service.id)) {
      throw new Error(`Invalid or duplicate service id: ${service.id}`);
    }
    ids.add(service.id);
    if (typeof service.name !== 'string' || !service.name.trim()) throw new Error(`${service.id}: name required`);
    if (!['active', 'legacy', 'pending_verification'].includes(service.status)) throw new Error(`${service.id}: invalid status`);
    if (!Array.isArray(service.representative_markets) || service.representative_markets.some(code => !/^[A-Z]{2}$/.test(code))) {
      throw new Error(`${service.id}: ISO country codes required; worldwide wildcards are not evidence`);
    }
    if (new Set(service.representative_markets).size !== service.representative_markets.length) throw new Error(`${service.id}: duplicate markets`);
    for (const [field, allowed] of [['offer_types', OFFER_TYPES], ['focus', FOCUS_TYPES]]) {
      if (!Array.isArray(service[field]) || service[field].some(value => !allowed.includes(value))) {
        throw new Error(`${service.id}: invalid ${field}`);
      }
    }
    if (!Array.isArray(service.aliases) || service.aliases.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error(`${service.id}: invalid aliases`);
    }
    requireHttps(service.homepage, service.id);
    if (!Array.isArray(service.official_sources) || !service.official_sources.length) throw new Error(`${service.id}: source required`);
    for (const source of service.official_sources) {
      requireHttps(source.url, `${service.id} source`);
      if (typeof source.note !== 'string' || !source.note.trim()) throw new Error(`${service.id}: source scope required`);
    }
    if (!isIsoDate(service.checked_on) || service.checked_on > registry.research_date) {
      throw new Error(`${service.id}: checked date required`);
    }
    if (!service.evidence_scope || !service.caveats) throw new Error(`${service.id}: limitations required`);
    if (service.integration !== 'directory_only') throw new Error(`${service.id}: directory must not assert a title integration`);
    if (service.status !== 'active' && service.offer_types.length) throw new Error(`${service.id}: inactive service cannot advertise current offers`);
    for (const [country, url] of Object.entries(service.destinations || {})) {
      if (!service.representative_markets.includes(country)) throw new Error(`${service.id}: unmapped destination`);
      requireHttps(url, `${service.id} destination`);
    }
  }
  for (const service of registry.services) {
    if (service.successor_id) {
      const successor = registry.services.find(row => row.id === service.successor_id);
      if (!successor || successor.id === service.id || successor.status !== 'active') {
        throw new Error(`${service.id}: successor must identify an active, distinct service`);
      }
    }
  }
  return registry;
}

function loadRegistry(root = path.resolve(__dirname, '..')) {
  return validateRegistry(JSON.parse(fs.readFileSync(path.join(root, 'data/streaming-services.json'), 'utf8')));
}

function projectDirectory(registry) {
  return validateRegistry(registry).services.filter(service => service.status === 'active').map(service => ({
    id: service.id,
    name: service.name,
    aliases: service.aliases,
    markets: service.representative_markets,
    kind: service.kind || 'films',
    url: service.homepage,
    ...(service.destinations ? {destinations: service.destinations} : {}),
    offer_types: service.offer_types,
    focus: service.focus,
    checked_on: service.checked_on,
    official_sources: service.official_sources,
    integration: 'directory_only'
  })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

module.exports = {loadRegistry, validateRegistry, projectDirectory, OFFER_TYPES, FOCUS_TYPES};
