import type { APIRoute } from 'astro';
import { clearAdminCookie } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  clearAdminCookie(cookies);
  return redirect('/admin/login', 302);
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  clearAdminCookie(cookies);
  return redirect('/admin/login', 302);
};
