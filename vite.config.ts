import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
    plugins: [svelte()],
    define: {
        __MANIFEST_VERSION_KEY__: "'v_riveConverterVersion'",
        __VERSION__: JSON.stringify(process.env.npm_package_version),
    },
})
