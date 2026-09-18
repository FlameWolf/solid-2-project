import { createMemo, For, Match, Switch } from "solid-js";
import Icon from "@/components/Icon";

interface Props {
	title: string;
	effectiveDate: string;
	intro: string;
	sections: LegalSection[];
}

export default function LegalPage(props: Props) {
	const introParagraphs = createMemo(() => props.intro.split("\n\n"));

	return (
		<>
			<div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
				<h2 class="mb-0">{props.title}</h2>
				<a href="/notes" class="btn btn-secondary btn-sm">
					<Icon type="chevronLeft"/>
					<span class="ms-2">Back to Notes</span>
				</a>
			</div>
			<article class="legal-content mx-auto">
				<p class="text-muted small mb-4">Last updated: {props.effectiveDate}</p>
				<For each={introParagraphs()}>{paragraph => <p>{paragraph}</p>}</For>
				<For each={props.sections}>
					{section => (
						<section class="mt-4">
							<h3 class="h5 mb-3">{section.heading}</h3>
							<For each={section.blocks}>
								{block => (
									<>
										<Switch>
											<Match when={block.type === "paragraph"}>
												<p innerHTML={(block as any).text}></p>
											</Match>
											<Match when={block.type === "list"}>
												<ul class="mb-3">
													<For each={(block as any).items}>{item => <li class="mb-1" innerHTML={item}></li>}</For>
												</ul>
											</Match>
										</Switch>
									</>
								)}
							</For>
						</section>
					)}
				</For>
			</article>
		</>
	);
}