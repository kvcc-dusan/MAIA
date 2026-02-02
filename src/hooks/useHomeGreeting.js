import { useState, useEffect } from 'react';
import { QUOTES } from '../data/quotes.js';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 22) return "Good evening";
  return "Good night";
}

function quoteForToday() {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return QUOTES[hash % QUOTES.length];
}

export function useHomeGreeting() {
  const [now, setNow] = useState(new Date());
  const [quote, setQuote] = useState(() => quoteForToday());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Check for quote update every minute
    const t = setInterval(() => setQuote(quoteForToday()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const greeting = greetingFor(now);

  return { now, quote, greeting };
}
