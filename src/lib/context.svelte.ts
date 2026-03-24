import { GraphicsAPI } from 'ograf'
import { createContext } from 'svelte'

export class AppContext {
	#hasUploadedFile = $state(false)
	#isPreviewing = $state(false)
	#graphic = $state<HTMLElement & GraphicsAPI.Graphic>()

	get hasUploadedFile() {
		return this.#hasUploadedFile
	}
	set hasUploadedFile(value: boolean) {
		this.#hasUploadedFile = value
	}

	get isPreviewing() {
		return this.#isPreviewing
	}
	set isPreviewing(value: boolean) {
		this.#isPreviewing = value
	}

	get graphic() {
		return this.#graphic
	}
	set graphic(value: (HTMLElement & GraphicsAPI.Graphic) | undefined) {
		this.#graphic = value
	}

	constructor() {}
}

export const [getAppContext, setAppContext] = createContext<AppContext>()
