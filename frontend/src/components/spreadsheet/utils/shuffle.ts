// Simple seeded random function (replaces seedrandom dependency)
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return function () {
    hash = (hash * 16807) % 2147483647;
    return (hash - 1) / 2147483646;
  };
}

export function shuffle<T>(array: T[], seed: string) {
  const random = seededRandom(seed);

  return [...array].sort(() => random() * 2 - 1);
}
