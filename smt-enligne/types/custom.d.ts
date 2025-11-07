// Local ambient declarations for untyped/optional packages used in the project
// Specific shims for untyped packages used by the project.
declare module 'embla-carousel-react' {
	export type EmblaOptionsType = Record<string, any>
	export type EmblaCarouselApi = {
		canScrollPrev: () => boolean
		canScrollNext: () => boolean
		scrollPrev: () => void
		scrollNext: () => void
		on: (event: string, cb: (...args: any[]) => void) => void
		off: (event: string, cb: (...args: any[]) => void) => void
	}
	export type UseEmblaCarouselType = [(node?: HTMLElement | null) => void, EmblaCarouselApi]
	export default function useEmblaCarousel(
		...args: any[]
	): UseEmblaCarouselType
}

declare module 'input-otp' {
	export const OTPInput: any
	export const OTPInputContext: any
}

declare module 'cmdk'
declare module 'vaul'
declare module 'react-resizable-panels'
// Radix packages provide their own types; no shim needed for scroll-area.

// Minimal type aliases to satisfy code that imports type-only names from react-hook-form
declare module 'react-hook-form' {
	export type FieldValues = Record<string, any>
	export type FieldPath<T> = string & keyof T
	export type ControllerProps<TFieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = any
	export const Controller: any
	export const FormProvider: any
	export const useFormContext: any
}
