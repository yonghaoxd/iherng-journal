'use client';

import { useEffect } from 'react';

/**
 * /ask moved to the home page. Shared answer links (/ask?q=<id>) keep working: the
 * query goes along, and without one the reader lands on the public questions.
 */
export function RedirectHome() {
  useEffect(() => {
    const { search } = window.location;
    window.location.replace(search ? `/${search}` : '/#feed');
  }, []);
  return null;
}
