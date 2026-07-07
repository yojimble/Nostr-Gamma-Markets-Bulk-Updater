#!/usr/bin/env node
// Queries nos.lol and relay.damus.io for kind 30402 (NIP-99) listings
// and prints the top 10 pubkeys by unique listing count.

const RELAYS = ['wss://nos.lol', 'wss://relay.damus.io'];
const LIMIT = 5000;
const TIMEOUT_MS = 15000;

function queryRelay(url) {
  return new Promise((resolve) => {
    const subId = Math.random().toString(36).slice(2);
    // pubkey -> Set of d-tags (deduplicates replaceable events)
    const counts = new Map();
    let ws;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try { ws.close(); } catch {}
      resolve(counts);
    };

    const timer = setTimeout(() => {
      console.error(`  [${url}] timed out after ${TIMEOUT_MS / 1000}s`);
      finish();
    }, TIMEOUT_MS);

    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error(`  [${url}] failed to connect: ${e.message}`);
      clearTimeout(timer);
      resolve(counts);
      return;
    }

    ws.addEventListener('open', () => {
      console.log(`  [${url}] connected, querying…`);
      ws.send(JSON.stringify(['REQ', subId, { kinds: [30402], limit: LIMIT }]));
    });

    ws.addEventListener('message', (msg) => {
      let data;
      try { data = JSON.parse(msg.data); } catch { return; }
      const [type, id, event] = data;
      if (type === 'EVENT' && id === subId) {
        const pubkey = event.pubkey;
        const d = event.tags.find(([t]) => t === 'd')?.[1] ?? '';
        if (!counts.has(pubkey)) counts.set(pubkey, new Set());
        counts.get(pubkey).add(d);
      } else if (type === 'EOSE' && id === subId) {
        clearTimeout(timer);
        console.log(`  [${url}] EOSE — ${[...counts.values()].reduce((n, s) => n + s.size, 0)} listings from ${counts.size} pubkeys`);
        finish();
      } else if (type === 'CLOSED' && id === subId) {
        clearTimeout(timer);
        finish();
      }
    });

    ws.addEventListener('error', (e) => {
      console.error(`  [${url}] error: ${e.message ?? 'unknown'}`);
      clearTimeout(timer);
      finish();
    });

    ws.addEventListener('close', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

async function main() {
  console.log('Querying relays for kind 30402 (NIP-99) listings…\n');

  const results = await Promise.all(RELAYS.map(queryRelay));

  // Merge: pubkey -> Set of "relay|d" keys so cross-relay duplicates are counted once
  const merged = new Map();
  results.forEach((counts, i) => {
    const relay = RELAYS[i];
    counts.forEach((dSet, pubkey) => {
      if (!merged.has(pubkey)) merged.set(pubkey, new Set());
      dSet.forEach((d) => merged.get(pubkey).add(`${relay}|${d}`));
    });
  });

  // Sort by unique listing count
  const sorted = [...merged.entries()]
    .map(([pubkey, keys]) => ({ pubkey, count: keys.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  console.log('\nTop 10 users by NIP-99 listing count:\n');
  console.log('Rank  Listings  Pubkey');
  console.log('────  ────────  ────────────────────────────────────────────────────────────────');
  sorted.forEach(({ pubkey, count }, i) => {
    console.log(`  ${String(i + 1).padStart(2)}  ${String(count).padStart(8)}  ${pubkey}`);
  });
}

main().catch(console.error);
