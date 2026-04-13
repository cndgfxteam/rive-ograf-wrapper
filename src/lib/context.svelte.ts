import type { Rive } from '@rive-app/webgl2'
import { GraphicsAPI } from 'ograf'
import { createContext } from 'svelte'
import type { TriggerMap } from './rive-interpreter'

export class AppContext {
	#hasUploadedFile = $state(false)
	#isPreviewing = $state(false)
	#hasDownloadedPackage = $state(false)
	#graphic = $state<HTMLElement & GraphicsAPI.Graphic>()
	#playActionTrigger = $state('')
	#stopActionTrigger = $state('')
	#triggers = $state<string[]>([])
	#triggerMap = $derived<TriggerMap>({
		playAction: this.#playActionTrigger,
		stopAction: this.#stopActionTrigger,
		customActions: this.#triggers.filter(
			(t) => t !== this.#playActionTrigger && t !== this.#stopActionTrigger
		),
	})
	#riveInstance?: Rive = $state()

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

	get hasDownloadedPackage() {
		return this.#hasDownloadedPackage
	}
	set hasDownloadedPackage(value: boolean) {
		this.#hasDownloadedPackage = value
	}

	get graphic() {
		return this.#graphic
	}
	set graphic(value: (HTMLElement & GraphicsAPI.Graphic) | undefined) {
		this.#graphic = value
	}

	get playActionTrigger() {
		return this.#playActionTrigger
	}
	set playActionTrigger(value: string) {
		this.#playActionTrigger = value
	}

	get stopActionTrigger() {
		return this.#stopActionTrigger
	}
	set stopActionTrigger(value: string) {
		this.#stopActionTrigger = value
	}

	get triggers() {
		return this.#triggers
	}
	set triggers(value: string[]) {
		this.#triggers = value
	}

	get triggerMap() {
		return this.#triggerMap
	}

	get riveInstance() {
		return this.#riveInstance
	}
	set riveInstance(value: Rive | undefined) {
		this.#riveInstance = value
	}

	constructor() {}
}

export const [getAppContext, setAppContext] = createContext<AppContext>()
