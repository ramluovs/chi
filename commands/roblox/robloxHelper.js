const BABY_BLUE = 0xaeefff;

// Safe fetch wrapper with timeout and custom headers to avoid Termux crashes
async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    return null;
  }
}

// Resolves a username or ID into { id, name, displayName }
async function resolveRobloxUser(input) {
  const cleanInput = input.trim();
  if (!cleanInput) return null;

  // If already an ID number
  if (/^\d+$/.test(cleanInput)) {
    const res = await safeFetch(`https://users.roblox.com/v1/users/${cleanInput}`);
    if (res && res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        displayName: data.displayName
      };
    }
  }

  // Lookup by username
  const res = await safeFetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernames: [cleanInput],
      excludeBannedUsers: false
    })
  });

  if (res && res.ok) {
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      return {
        id: data.data[0].id,
        name: data.data[0].name,
        displayName: data.data[0].displayName
      };
    }
  }

  return null;
}

module.exports = {
  BABY_BLUE,
  safeFetch,
  resolveRobloxUser
};
