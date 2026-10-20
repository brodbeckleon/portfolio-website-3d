import { error } from '@sveltejs/kit';
import { getPhoto } from '$lib/photos';
import type { PageLoad } from './$types';

// Rendered per request rather than prerendered: the locale comes from a
// cookie, so a prerendered page would be stuck in the base language.
export const load: PageLoad = ({ params }) => {
	if (!getPhoto(params.id)) error(404, 'Photo not found');
	return { id: params.id };
};
