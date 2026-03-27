import { enhancedImages } from '@sveltejs/enhanced-img'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [tailwindcss(), enhancedImages(), svelte()],
	define: {
		__MANIFEST_VERSION_KEY__: "'v_riveConverterVersion'",
		__VERSION__: JSON.stringify(process.env.npm_package_version),
	},
	base: '/rive-ograf-wrapper/',
})
