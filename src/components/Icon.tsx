import { icons } from "@/content/icons";
import { camelToKebab } from "@/utils/common";

interface Props {
	type: keyof typeof icons;
}

export default function Icon(props: Props) {
	return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class={["bi", { [`bi-${camelToKebab(props.type)}`]: true }]} innerHTML={icons[props.type]}></svg>;
}