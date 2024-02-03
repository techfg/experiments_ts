import { array_isEmpty } from "./deps.ts"
import { BinaryInput, BinaryOutput, BinaryPureStep } from "./typedefs.ts"


export class BinaryMultiStateStep<
	STATES extends { [state: PropertyKey]: BinaryPureStep<any> },
	ARGS_UNION = STATES[keyof STATES] extends BinaryPureStep<any, infer ARGS> ? ARGS : any
> extends BinaryPureStep<STATES[keyof STATES], ARGS_UNION> {
	public state: keyof STATES
	protected readonly states: STATES
	protected lost!: never

	constructor(states: STATES, initial_state: keyof STATES) {
		super()
		this.state = initial_state
		this.states = states
	}
	forward(input: BinaryInput<ARGS_UNION>): BinaryOutput<STATES[keyof STATES]> {
		const step = this.states[this.state]
		return step.forward(input)
	}
	backward(input: Omit<BinaryOutput<STATES[keyof STATES]>, "len">): BinaryInput<ARGS_UNION> {
		const step = this.states[this.state]
		return step.backward(input)
	}
}


export class BinaryStackedStateStep<
	STATES extends { [state: PropertyKey]: BinaryPureStep<any> },
	ARGS_UNION = STATES[keyof STATES] extends BinaryPureStep<any, infer ARGS> ? ARGS : any
> extends BinaryPureStep<STATES[keyof STATES], ARGS_UNION> {
	protected default_state: keyof STATES
	protected readonly states: STATES
	protected stack: Array<keyof STATES> = []
	protected lost!: never

	constructor(states: STATES, default_state: keyof STATES) {
		super()
		this.default_state = default_state
		this.states = states
	}
	forward(input: BinaryInput<ARGS_UNION>): BinaryOutput<STATES[keyof STATES]> {
		const step = this.states[this.pop()]
		return step.forward(input)
	}
	backward(input: Omit<BinaryOutput<STATES[keyof STATES]>, "len">): BinaryInput<ARGS_UNION> {
		const step = this.states[this.pop()]
		return step.backward(input)
	}
	push(...states: Array<keyof STATES>) {
		this.stack.push(...states)
	}
	pop(): keyof STATES {
		const stack = this.stack
		return array_isEmpty(stack) ? this.default_state : stack.pop()!
	}
}


export type ConditionalStepEntry<OUT = any, ARGS = any> = [
	forward_condition: (current_input: BinaryInput<ARGS>) => boolean,
	backward_condition: (current_input: Omit<BinaryOutput<OUT>, "len">) => boolean,
	step: BinaryPureStep<OUT, ARGS>
]
export class BinaryConditionalStep<
	CONDITIONS extends Array<ConditionalStepEntry>,
	OUT_UNION extends (CONDITIONS[number] extends ConditionalStepEntry<infer OUT, unknown> ? OUT : unknown) = (CONDITIONS[number] extends ConditionalStepEntry<infer OUT, unknown> ? OUT : unknown),
	ARGS_UNION extends (CONDITIONS[number] extends ConditionalStepEntry<unknown, infer ARGS> ? ARGS : unknown) = (CONDITIONS[number] extends ConditionalStepEntry<unknown, infer ARGS> ? ARGS : unknown)
> extends BinaryPureStep<OUT_UNION, ARGS_UNION> {
	protected readonly conditions: CONDITIONS
	protected default_step: BinaryPureStep<any>
	protected lost!: never
	constructor(conditions: CONDITIONS, default_step: BinaryPureStep<any>) {
		super()
		this.conditions = conditions
		this.default_step = default_step
	}
	forward(input: BinaryInput<ARGS_UNION>): BinaryOutput<OUT_UNION> {
		for (const [forward_condition, , step] of this.conditions) {
			if (forward_condition(input)) {
				return step.forward(input)
			}
		}
		return this.default_step.forward(input)
	}
	backward(input: Omit<BinaryOutput<OUT_UNION>, "len">): BinaryInput<ARGS_UNION> {
		for (const [, backward_condition, step] of this.conditions) {
			if (backward_condition(input)) {
				return step.backward(input)
			}
		}
		return this.default_step.backward(input)
	}
}
