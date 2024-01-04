
export class CompilerContext {
	/** collection of all language features plugged into the current context */
	private features: Map<FeatureFactory, Parser> = new Map()

	/** tokens in order of precedence (first element is scanned first, last element is scanned last) */
	tokens: Array<TokenKind> = []

	/** the mapping of what {@link Parser | language feature} each registered token (in {@link tokens | this.tokens}) correspond to */
	private token_feature: Map<TokenKind, Parser> = new Map()

	constructor() {

	}

	addFeature<F extends FeatureFactory>(feature_factory: F): ReturnType<typeof feature_factory> {
		const
			feature = feature_factory(this),
			tokens = feature.tokens
		tokens.forEach((tkn) => { this.token_feature.set(tkn, feature) })
		this.features.set(feature_factory, feature)
		return feature as ReturnType<F>

	}

	getFeature<F extends FeatureFactory>(feature_factory: F): ReturnType<typeof feature_factory> {
		return this.features.has(feature_factory) ?
			this.features.get(feature_factory)! as ReturnType<F> :
			this.addFeature(feature_factory) as ReturnType<F>
	}

	tokenizeText(text: string): Array<TokenKind> {

	}

	parseTokens(tokens: Array<TokenKind>): ProgramNode {

	}
}
